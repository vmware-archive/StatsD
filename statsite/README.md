
## Wavefront Statsite Sink

Statsite is a metric aggregation server heavily based on StatsD but written in C. Visit https://github.com/armon/statsite for more information.

## Installation

Copy `wavefront.py` from this directory to `statsite/sinks`. It can be used exactly like the graphite sink, except it should be pointed at your Wavefront proxy within your statsite config:

```
stream_cmd = python sinks/wavefront.py localhost 2878
```

## Using with Tags

```
# A gauge with no tag
echo "test.gauge1:+3|g" | nc -u -w0 localhost 8125

# A gauge with a source tag
echo "test.gauge1_t_source_v_mysource:+3|g" | nc -u -w0 localhost 8125

# A gauge with a source tag and another tag
echo "test.gauge1_t_source_v_mysource_t_mytag_v_myval:+3|g" | nc -u -w0 localhost 8125

# A timer with tags
echo "test.timer1_t_source_v_mysource_t_mytag_v_myval:10|ms" | nc -u -w0 localhost 8125

# A counter with tags
echo "test.counter1_t_source_v_mysource_t_mytag_v_myval:1|c" | nc -u -w0 localhost 8125
```
