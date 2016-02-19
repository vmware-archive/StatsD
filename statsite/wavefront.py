"""
Supports flushing metrics to wavefront
"""
import sys
import socket
import logging


class WavefrontStore(object):
    def __init__(self, host="localhost", port=2003, prefix="statsite.", attempts=3):
        """
        Implements an interface that allows metrics to be persisted to Graphite.
        Raises a :class:`ValueError` on bad arguments.

        :Parameters:
            - `host` : The hostname of the wavefront server.
            - `port` : The port of the wavefront server
            - `prefix` (optional) : A prefix to add to the keys. Defaults to 'statsite.'
            - `attempts` (optional) : The number of re-connect retries before failing.
        """
        # Convert the port to an int since its coming from a configuration file
        port = int(port)
        attempts = int(attempts)

        if port <= 0:
            raise ValueError("Port must be positive!")
        if attempts < 1:
            raise ValueError("Must have at least 1 attempt!")

        self.logger = logging.getLogger("statsite.wavefrontstore")
        self.host = host
        self.port = port
        self.prefix = prefix
        self.attempts = attempts
        self.sock = self._create_socket()


    def remove_tags(k1,k2):
        if "_t_" in k2:
          keyparts = k2.split("_t_")
          key = keyparts[0]
          # look at the last part of the array to see if it has timer metrics
          if "." in keyparts[-1]:
            lastparts = keyparts[-1].split(".")
            counter = 0
            for lastpart in lastparts:
              if counter > 0:
                key += "." + lastpart
              counter = counter+1 
          return key
        else:
          return k2 
        
    def parse_tags(k1,k2):
        if "_t_" in k2: 
          tagstr = "" 
          # split the string
          tags = k2.split("_t_")
          for tag in tags:
            if "_v_" in tag:
                tagparts = tag.split("_v_")
                tagstr += tagparts[0]
                if "." not in tagparts[1]:
                    tagstr += "=" + tagparts[1] + " "
                else:
                    tagstr += "=" +tagparts[1].split(".")[0]
          return tagstr
        else:
         return ""

    def flush(self, metrics):
        """
        Flushes the metrics provided to Graphite.

       :Parameters:
        - `metrics` : A list of "key|value|timestamp" strings.
        """
        if not metrics:
            return

        # Construct the output
        metrics = [m.split("|") for m in metrics if m and m.count("|") == 2]

        self.logger.info("Outputting %d metrics" % len(metrics))
        if self.prefix:
            lines = ["%s%s %s %s %s" % (self.prefix, self.remove_tags(k), v, ts, self.parse_tags(k)) for k, v, ts in metrics]
        else:
            lines = ["%s %s %s %s" % (self.remove_tags(k), v, ts, self.parse_tags(k)) for k, v, ts in metrics]
        data = "\n".join(lines) + "\n"

        print data

        # Serialize writes to the socket
        try:
            self._write_metric(data)
        except:
            self.logger.exception("Failed to write out the metrics!")

    def close(self):
        """
        Closes the connection. The socket will be recreated on the next
        flush.
        """
        try:
            if self.sock:
                self.sock.close()
        except:
            self.logger.warning("Failed to close connection!")

    def _create_socket(self):
        """Creates a socket and connects to the wavefront server"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.connect((self.host, self.port))
        except:
            self.logger.error("Failed to connect!")
            sock = None
        return sock

    def _write_metric(self, metric):
        """Tries to write a string to the socket, reconnecting on any errors"""
        for attempt in xrange(self.attempts):
            if self.sock:
                try:
                    self.sock.sendall(metric)
                    return
                except socket.error:
                    self.logger.exception("Error while flushing to wavefront. Reattempting...")

            self.sock = self._create_socket()

        self.logger.critical("Failed to flush to Graphite! Gave up after %d attempts." % self.attempts)


if __name__ == "__main__":
    # Initialize the logger
    logging.basicConfig()

    # Intialize from our arguments
    wavefront = WavefrontStore(*sys.argv[1:])

    # Get all the inputs
    metrics = sys.stdin.read()

    # Flush
    wavefront.flush(metrics.splitlines())
    wavefront.close()


			
	
