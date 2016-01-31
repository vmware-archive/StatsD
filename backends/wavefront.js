/*
 * Flush stats to wavefront (http://wavefront.net/).
 *
 * To enable this backend, include 'wavefront' in the backends
 * configuration array:
 *
 *   backends: ['wavefront']
 *
 * This backend supports the following config options:
 *
 *   wavefrontHost: Hostname of wavefront server.
 *   wavefrontPort: Port to contact wavefront server at.
 */

var net = require('net'),
   util = require('util');

var debug;
var flushInterval;
var wavefrontHost;
var wavefrontPort;
var wavefrontTagPrefix;
var defaultSource;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;

// set up namespaces
var legacyNamespace = true;
var globalNamespace  = [];
var counterNamespace = [];
var timerNamespace   = [];
var gaugesNamespace  = [];
var setsNamespace     = [];

var wavefrontStats = {};

var post_stats = function wavefront_post_stats(statString) {
  var last_flush = wavefrontStats.last_flush || 0;
  var last_exception = wavefrontStats.last_exception || 0;
  if (wavefrontHost) {
    try {
      var wavefront = net.createConnection(wavefrontPort, wavefrontHost);
      wavefront.addListener('error', function(connectionException){
        if (debug) {
          util.log(connectionException);
        }
      });
      wavefront.on('connect', function() {
        var ts = Math.round(new Date().getTime() / 1000);
        var namespace = globalNamespace.concat('statsd');
        //statString += 'put ' + namespace.join(".") + '.wavefrontStats.last_exception ' + last_exception + ' ' + ts + "\n";
        //statString += 'put ' + namespace.join(".") + '.wavefrontStats.last_flush ' + last_flush + ' ' + ts + "\n";
		if (debug) {
			util.log(statString)
		}
        this.write(statString);
        this.end();
        wavefrontStats.last_flush = Math.round(new Date().getTime() / 1000);
      });
    } catch(e){
      if (debug) {
        util.log(e);
      }
      wavefrontStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
}

function parse_tags(metric_name) {
  var tags = [];
  var tagParts = metric_name.split(wavefrontTagPrefix);
  for (var i=1;i<tagParts.length;i++) {
    var tagAndVal = tagParts[i].split("_v_");
    var tag = tagAndVal[0];
    var val = tagAndVal[1];
    tags.push(tag+"="+val);
  }
  return tags;
}


// Strips out all tag information from the given metric name
function strip_tags(metric_name) {
  return metric_name.split(wavefrontTagPrefix)[0];
}


var flush_stats = function wavefront_flush(ts, metrics) {
  //var suffix = " source=statsd\n";
  var suffix = "\n";
  if (defaultSource) {
   suffix = " source=" + defaultSource + "\n"; 
  }
  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;
  var timer_data_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var sets = metrics.sets;
  var timer_data = metrics.timer_data;
  var statsd_metrics = metrics.statsd_metrics;

  for (key in counters) {
    var tags = parse_tags(key);
    var stripped_key = strip_tags(key)

    var namespace = counterNamespace.concat(stripped_key);
    var value = counters[key];

    if (legacyNamespace === true) {
      //statString += 'put stats_counts.' + key + ' ' + ts + ' ' + value + ' ' + tags.join(' ') + suffix;
      statString += 'stats_counts.' + key + ' ' + value + ' ' + ts + ' ' + tags.join(' ') + suffix;
    } else {
      statString += namespace.concat('count').join(".") + ' ' + value + ' ' + ts + ' ' + tags.join(' ') + suffix;
    }

    numStats += 1;
  }

  for (key in timer_data) {
    if (Object.keys(timer_data).length > 0) {
      for (timer_data_key in timer_data[key]) {
        var tags = parse_tags(key);
        var stripped_key = strip_tags(key)

        var namespace = timerNamespace.concat(stripped_key);
        var the_key = namespace.join(".");
        statString += 'put ' + the_key + '.' + timer_data_key + ' ' + ts + ' ' + timer_data[key][timer_data_key] + ' ' + tags.join(' ') + suffix;
      }

      numStats += 1;
    }
  }

  for (key in gauges) {
    var tags = parse_tags(key);
    var stripped_key = strip_tags(key)

    var namespace = gaugesNamespace.concat(stripped_key);
    //statString += 'put ' + namespace.join(".") + ' ' + ts + ' ' + gauges[key] + ' ' + tags.join(' ') + suffix;
    statString += namespace.join(".") + ' ' + gauges[key] + ' ' + ts + ' ' + tags.join(' ') + suffix;
    numStats += 1;
  }

  for (key in sets) {
    var tags = parse_tags(key);
    var stripped_key = strip_tags(key)

    var namespace = setsNamespace.concat(stripped_key);
    //statString += 'put ' + namespace.join(".") + '.count ' + ts + ' ' + sets[key].values().length + ' ' + tags.join(' ') + suffix;
    statString += namespace.join(".") + '.count ' + sets[key].values().length + ' ' + ts + ' ' + tags.join(' ') + suffix;
    numStats += 1;
  }

  var namespace = globalNamespace.concat('statsd');
  if (legacyNamespace === true) {
    //statString += 'put statsd.numStats ' + ts + ' ' + numStats + suffix;
    statString += 'statsd.numStats ' + numStats + ' ' + ts + suffix;
    //statString += 'put stats.statsd.wavefrontStats.calculationtime ' + ts + ' ' + (Date.now() - starttime) + suffix;
    statString += 'stats.statsd.wavefrontStats.calculationtime ' + (Date.now() - starttime) + ' ' + ts + suffix;
    for (key in statsd_metrics) {
      statString += 'stats.statsd.' + key + ' ' + statsd_metrics[key] + ' ' + ts + suffix;
    }
  } else {
    //statString += 'put ' + namespace.join(".") + '.numStats ' + ts + ' ' + numStats + suffix;
    statString += namespace.join(".") + '.numStats ' + numStats + ' ' + ts + suffix;
    //statString += 'put ' + namespace.join(".") + '.wavefrontStats.calculationtime ' + ts + ' ' + (Date.now() - starttime) + suffix;
    for (key in statsd_metrics) {
      var the_key = namespace.concat(key);
      //statString += 'put ' + the_key.join(".") + ' ' + ts + ' ' + statsd_metrics[key] + suffix;
      statString += the_key.join(".") + ' ' + statsd_metrics[key] + ' ' + ts + suffix;
    }
  }
  post_stats(statString);
};

var backend_status = function wavefront_status(writeCb) {
  for (stat in wavefrontStats) {
    writeCb(null, 'wavefront', stat, wavefrontStats[stat]);
  }
};

exports.init = function wavefront_init(startup_time, config, events) {
  debug = config.debug;
  wavefrontHost = config.wavefrontHost;
  wavefrontPort = config.wavefrontPort;
  wavefrontTagPrefix = config.wavefrontTagPrefix;
  defaultSource = config.defaultSource;
  config.wavefront = config.wavefront || {};
  globalPrefix    = config.wavefront.globalPrefix;
  prefixCounter   = config.wavefront.prefixCounter;
  prefixTimer     = config.wavefront.prefixTimer;
  prefixGauge     = config.wavefront.prefixGauge;
  prefixSet       = config.wavefront.prefixSet;
  legacyNamespace = config.wavefront.legacyNamespace;

  // set defaults for prefixes
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : "stats";
  prefixCounter = prefixCounter !== undefined ? prefixCounter : "counters";
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : "timers";
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : "gauges";
  prefixSet     = prefixSet !== undefined ? prefixSet : "sets";
  legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : true;


  if (legacyNamespace === false) {
    if (globalPrefix !== "") {
      globalNamespace.push(globalPrefix);
      counterNamespace.push(globalPrefix);
      timerNamespace.push(globalPrefix);
      gaugesNamespace.push(globalPrefix);
      setsNamespace.push(globalPrefix);
    }

    if (prefixCounter !== "") {
      counterNamespace.push(prefixCounter);
    }
    if (prefixTimer !== "") {
      timerNamespace.push(prefixTimer);
    }
    if (prefixGauge !== "") {
      gaugesNamespace.push(prefixGauge);
    }
    if (prefixSet !== "") {
      setsNamespace.push(prefixSet);
    }
  } else {
      globalNamespace = ['stats'];
      counterNamespace = ['stats'];
      timerNamespace = ['stats', 'timers'];
      gaugesNamespace = ['stats', 'gauges'];
      setsNamespace = ['stats', 'sets'];
  }

  wavefrontStats.last_flush = startup_time;
  wavefrontStats.last_exception = startup_time;

  flushInterval = config.flushInterval;

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};