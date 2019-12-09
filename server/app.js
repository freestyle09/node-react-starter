const config = require('config');
const cookieParser = require('cookie-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const multer = require('multer');
const passport = require('passport');
const uuidv4 = require('uuid/v4');

const candidates = require('./routes/candidates');
const offers = require('./routes/offers');
const passportConfig = require('./passport');
const statsd = require('./config/statsd');
const winston = require('./config/winston');

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(morgan('combined', {stream: winston.stream}));

// Passport
app.use(passport.initialize());
passportConfig.setup();

// Mongo
async function connectDB() {
  const {host, resource, query, name} = config.get('mongo.uri');
  const dbCredentials = config.get('mongo.credentials');

  const settings = {
    ...dbCredentials,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  };
  const dbURI = `${name}://${host}/${resource}${query}`;
  winston.info('Trying to connect to mongodb [URI] ', {dbURI});

  try {
    const connection = await mongoose.connect(dbURI, settings);
    winston.info('MoongoDB Connected');
    return connection;
  } catch (err) {
    winston.error('MoongoDB not connected', err);
  }
  return null;
}

connectDB();

const configStorage = destPath => {
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, destPath);
    },
    filename: function(req, file, cb) {
      const {email = 'unkown_email'} = req.body;
      const uniqId = uuidv4();
      let current_datetime = new Date();
      let formatted_date = `${current_datetime.getFullYear()}-${current_datetime.getMonth() +
        1}-${current_datetime.getDate()}`;
      cb(null, `${formatted_date}_${email}_${uniqId}_${file.originalname}`);
    },
  });

  const uploader = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  return uploader;
};

const uploader = configStorage(config.get('uploader.destPath'));

// Routes
app.use('/api/candidates', candidates.router(uploader));
app.use('/api/offers', offers.getRouting());

// Error handler

const getErrorForStatus = statusNumber => {
  if (statusNumber >= 400 && statusNumber < 500) {
    if (statusNumber == 404) {
      return 'NOT_FOUND';
    } else {
      return 'BAD_REQUEST';
    }
  } else {
    return 'INTERNAL_SERVER_ERROR';
  }
};

app.use(function(err, req, res, next) {
  const errorId = uuidv4();

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  const status = err.status || 500;

  winston.error(
    `${req.originalUrl} - ${req.method} - ${errorId} - ${status} - ${err.name} - ${err.message} - ${req.ip}`,
    {
      id: errorId,
      status: status,
      name: err.name,
      message: err.message,
      stack: err.stack,
      originalException: err.originalException ? err.originalException : 'NONE',
    }
  );

  const errorLabel = getErrorForStatus(status);

  statsd.client.increment(`cicada.server.errors.${errorLabel}`);

  res.status(status);
  res.json({
    id: errorId,
    timestamp: new Date(),
    status: status,
    error: errorLabel,
    exception: err.name,
    message: err.message,
    path: req.originalUrl,
  });
});

module.exports = {app};
