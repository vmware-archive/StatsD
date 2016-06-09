
var net = require('net'),
   util = require('util');

var debug;
var flushInterval;
var wavefrontHost;
var wavefrontPort;
var wavefrontTagPrefix;
var defaultSource;
var graphiteSourceStartsWith;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;

// set up namespaces
var legacyNamespace = false;
var globalNamespace  = [];
var counterNamespace = [];
var timerNamespace   = [];
var gaugesNamespace  = [];
var setsNamespace     = [];

var wavefrontStats = {};

var postStats = function wavefrontPostStats(statString) {

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

function parseTags(metricName) {
  var tags = [];
  //stats.gauges.gauge1~tag=val~tag2=val2
  var tagParts = metricName.split(wavefrontTagPrefix);
  for (var i=1;i<tagParts.length;i++) {
    if (i > 0) {
      //does the tag have a value?
      if (tagParts[i].substr(-1) === "=") {
        continue;
      }
      tags.push(tagParts[i]);
    }
  }
  //does this metric have a source tag?
  if (("|" + tags.join("|")).indexOf("|source=") == -1) { // no
    //is graphiteSourceStartsWith set?
    if (graphiteSourceStartsWith != undefined && metricName.indexOf(graphiteSourceStartsWith) > -1) { //yes
      //extract source from metric name
      tags.push("source="+extractSourceTagValue(metricName,graphiteSourceStartsWith));
    } else {
      tags.push("source="+defaultSource);
    }
  }
  return tags;
}

// Extracts a source tag from parts of a metic value based on a prefix
function extractSourceTagValue(metricName, prefix) {
  parts = metricName.split(".")
  for (var i=0;i<parts.length;i++) {
    if (parts[i].indexOf(prefix) > -1) {
      return parts[i];
    }
  }
}

// Strips tags out of metric name
function stripTags(metricName) {
  var new_key = metricName.split(wavefrontTagPrefix)[0];

  //remove source tag from key if graphiteSourceStartsWith is set
  if (graphiteSourceStartsWith != undefined && new_key.indexOf(graphiteSourceStartsWith) > -1) {
    var parts = new_key.split(".");
    var deleteIndex = undefined;
    for (var i=0;i<parts.length;i++) {
      if (parts[i].indexOf(graphiteSourceStartsWith) > -1) {
        deleteIndex = i
      }
    }
    parts.splice(deleteIndex,1);
    new_key = parts.join(".");
  }

  //make sure the key doesn't have ".."
  if (new_key.indexOf("..") > -1) {
    new_key = new_key.replace("..",".");
  }

  //make sure the key doesn't start with "."
  if (new_key.substr(0,1) == ".") {
    new_key = new_key.substr(1,new_key.length-1)
  }

  return new_key
}

function makeStat(key, value, ts, tags) {
  return key + ' ' + value + ' ' + ts + ' ' + tags.join(' ') + "\n";
}


var flushStats = function wavefrontFlush(ts, metrics) {

  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;
  var timerData_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var sets = metrics.sets;
  var timerData = metrics.timer_data;
  var statsd_metrics = metrics.statsd_metrics;

  for (key in counters) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = counterNamespace.concat(strippedKey);
    var value = counters[key];

    if (legacyNamespace === true) {
      statString += makeStat('stats_counts.' + key, value, ts, tags);
    } else {
      statString += makeStat(namespace.concat('count').join("."), value, ts, tags);
    }

    numStats += 1;
  }

  for (key in timerData) {
    if (Object.keys(timerData).length > 0) {
      for (timerData_key in timerData[key]) {
        var tags = parseTags(key);
        var strippedKey = stripTags(key)

        var namespace = timerNamespace.concat(strippedKey);
        var the_key = namespace.join(".");

        statString += makeStat(the_key + '.' + timerData_key, timerData[key][timerData_key], ts, tags);
      }
      numStats += 1;
    }
  }

  for (key in gauges) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = gaugesNamespace.concat(strippedKey);
    statString += makeStat(namespace.join("."), gauges[key], ts, tags);
    numStats += 1;
  }

  for (key in sets) {
    var tags = parseTags(key);
    var strippedKey = stripTags(key)

    var namespace = setsNamespace.concat(strippedKey);
    statString += makeStat(namespace.join(".") + '.count', sets[key].values().length, ts, tags);
    numStats += 1;
  }

  var namespace = globalNamespace.concat('statsd');
  if (legacyNamespace === true) {
    statString += makeStat('statsd.numStats', numStats, ts, []);
    statString += makeStat('stats.statsd.wavefrontStats.calculationtime', Date.now() - starttime, ts, []);
    for (key in statsd_metrics) {
      statString += makeStat('stats.statsd.' + key, statsd_metrics[key], ts, []);
    }
  } else {
    //manually add source tag
    var defaultSourceTag = ['source=' + defaultSource];
    statString += makeStat(namespace.join(".") + '.numStats', numStats, ts, defaultSourceTag);
    for (key in statsd_metrics) {
      var the_key = namespace.concat(key);
      statString += makeStat(the_key.join("."), statsd_metrics[key], ts,  defaultSourceTag);
    }
  }
  //console.log(statString);
  postStats(statString);
};

var backendStatus = function wavefrontStatus(writeCb) {
  for (stat in wavefrontStats) {
    writeCb(null, 'wavefront', stat, wavefrontStats[stat]);
  }
};

exports.init = function wavefrontInit(startup_time, config, events) {
  debug = config.debug;
  wavefrontHost = config.wavefrontHost;
  wavefrontPort = config.wavefrontPort;
  defaultSource = config.defaultSource;
  wavefrontTagPrefix = config.wavefrontTagPrefix;
  graphiteSourceStartsWith = config.graphiteSourceStartsWith;
  config.wavefront = config.wavefront || {};
  globalPrefix    = config.wavefront.globalPrefix;
  prefixCounter   = config.wavefront.prefixCounter;
  prefixTimer     = config.wavefront.prefixTimer;
  prefixGauge     = config.wavefront.prefixGauge;
  prefixSet       = config.wavefront.prefixSet;

  //LegacyNamespace support is depricated!
  //legacyNamespace = config.wavefront.legacyNamespace;

  // set defaults for prefixes
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : "stats";
  prefixCounter = prefixCounter !== undefined ? prefixCounter : "counters";
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : "timers";
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : "gauges";
  prefixSet     = prefixSet !== undefined ? prefixSet : "sets";
  legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : false;


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

  events.on('flush', flushStats);
  events.on('status', backendStatus);

  return true;
};
