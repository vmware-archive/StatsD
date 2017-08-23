# NB This project is considered depcrecated. Please see Integrations --> Statsd within the Wavefront UI.

This repository contains a Wavefront backend for Etsy's popular StatsD implementation written in NodeJS.

We now recommend using Telegraf's StatsD service plugin if you're not already using a StatsD server. You can learn how to use it with Wavefront [here](https://community.wavefront.com/docs/DOC-1036).

# Wavefront StatsD Backend (NodeJS)

The Wavefront StatsD backend emits StatsD metrics to Wavefront. It also extends StatsD by allowing point tags.

## Installation
This readme assumes you've already downloaded [statsd](https://github.com/etsy/statsd) and have a basic understanding. 

1. Clone or download StatsD from https://github.com/etsy/statsd.
2. Simply drop `backends/wavefront.js` from this repository into the statsd `backends` directory.
3. Update `config.js` to use the backend.

## Configuring

The backend expects the following parameters:
- wavefrontHost - The host on your network that is running the Wavefront proxy.
- wavefrontPort - The port that your Wavefront proxy is listening on.
- wavefrontTagPrefix - The prefix for point tags (see Tagging Metrics below).
- defaultSource - The source tag that will get added to metrics as they're sent to Wavefront if one is not provided. If defaultSource is not set it will default to the hostname of the server running the StatsD instance.

Below is an example of a complete config.js for using the Wavefront backend.
```
{ 
  port: 8125
, backends: ["./backends/wavefront"]
, wavefrontHost: '192.168.99.100'
, wavefrontPort: 2878
, wavefrontTagPrefix: '~'
, keyNameSanitize: false
}
```


## Tagging Metrics

By default, you can send metrics through StatsD as follows:

```
echo "gauge1:+3|g" | nc -u -w0 192.168.99.100 8125
```

The Wavefront backend supports tagging by allowing you to pass tags as part of the metric name. In order to support this, the `keyNameSanitize` config option must be set to `false` in your config. For example:

```
echo "gauge1~tag1=v1~tag2=v2:+3|g" | nc -u -w0 192.168.99.100 8125
```
This will produce a metric that looks like:
```
gauge1:+3
 - tag1:v1
 - tag2:v2
```

Metrics are sent to Wavefront in the Wavefront format. See the "Wavefront Data Format" in our knowledgebase for more information.

### Requirements

The Wavefront backend will work with any recent copy of StatsD. It will not work with version 0.7.2 or before as the `keynameSanitize` option was not added until ~ Feb 2015.


