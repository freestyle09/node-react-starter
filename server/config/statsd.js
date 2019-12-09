const config = require('config');
const StatsD = require('node-statsd');

const winston = require('../config/winston');

statsdConfig = config.get('statsd');

winston.info('Statsd configuration', {
  statsdConfig,
});

const client = new StatsD(statsdConfig);

client.socket.on('error', function(error) {
  return console.error('Error in socket: ', error);
});

module.exports = {
  client,
};
