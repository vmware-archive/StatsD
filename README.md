

# Wavefront StatsD Plugin

The Wavefront StatsD Plugin sends StatsD metrics to Wavefront. It also extends StatsD by allowing point tags.

## Tagging Metrics

By default, you can send metrics to StatsD as follows:

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

## Installation

1. Clone or download StatsD from https://github.com/etsy/statsd.
2. Copy `config.js` and `backends/wavefront.js` from this repository into the statsd directory.
3. Update `config.js` to point to your Wavefront agent. Here is the sample config.js:

```
{
  port: 8125
, backends: ["./backends/wavefront"]
, dumpMessages: true
, wavefrontProxyServer: "192.168.99.100"
, wavefrontProxyPort: 3878
}
```
Run StatsD with the new config:
```
node stats.js config.js
```