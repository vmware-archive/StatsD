

# Wavefront StatsD Plugin

The Wavefront StatsD Plugin emits StatsD metrics to Wavefront. It also extends StatsD by allowing point tags.

## Installation

1. Clone or download StatsD from https://github.com/etsy/statsd.
2. Simply drop `backends/wavefront.js` from this repository into the statsd `backends` directory.
3. Update `config.js` to use the backend.

## Configuring

The backend expects the following parameters:
- wavefrontHost - The host on your network that is running the Wavefront proxy.
- wavefrontPort - The port that your Wavefront proxy is listening on.
- wavefrontTagPrefix - The prefix for point tags (see Tagging Metrics below).
- defaultSource - The source tag that will get added to metrics as they're sent to Wavefront.


Below is an example of a complete config.js for using the Wavefront backend.
```
{ 
  port: 8125
, backends: ["./backends/wavefront"]
, wavefrontHost: '192.168.99.100'
, wavefrontPort: 2878
, wavefrontTagPrefix: '_t_'
, defaultSource: "statsd"
}
```


## Tagging Metrics

By default, you can send metrics through StatsD as follows:

```
echo "gauge1:+3|g" | nc -u -w0 192.168.99.100 8125
```

The Wavefront backend supports tagging by adding `_t_` (tag) and `_v_` (tag value) flags to your metric names. For example:

```
echo "gauge1_t_tag1_v_v1_t_tag2_v_v2:+3|g" | nc -u -w0 192.168.99.100 8125
```
This will produce a metric that looks like:
```
gauge1:+3
 - tag1:v1
 - tag2:v2
```

Metrics are sent to Wavefront in the Wavefront format. See the "Wavefront Data Format" in our knowledgebase for more information.




