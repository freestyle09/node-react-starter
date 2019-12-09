var appRoot = require('app-root-path');
var winston = require('winston');

var logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      level: 'info',
      format: winston.format.json(),
      filename: `${appRoot}/logs/app.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      colorize: false,
    }),
  ],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;
