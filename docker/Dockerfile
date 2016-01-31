FROM ubuntu

# Install git and curl
RUN apt-get install git -y
RUN apt-get install curl -y

# Add node repository to sources
RUN curl -sL https://deb.nodesource.com/setup | sudo bash -

# Install node
RUN apt-get install nodejs -y

WORKDIR /opt

# Get statsd
RUN git clone https://github.com/etsy/statsd.git

WORKDIR /opt/statsd

# Download The Wavefront Backend
RUN curl -o backends/wavefront.js https://raw.githubusercontent.com/wavefrontHQ/StatsD/master/backends/wavefront.js

EXPOSE 8125

CMD ["node","stats.js","/opt/statsd/config.js"]
