const config = require('config');
const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4');
const R = require('ramda');
const nodemailer = require('nodemailer');

const statsd = require('../../config/statsd');
const {Candidate} = require('../../models/Candidate');
const winston = require('../../config/winston');

function generateAccessToken(userId, payload) {
  winston.info('Generating token for user', {
    userId,
    payload,
  });

  // How long will the token be valid for
  const expiresIn = '1 hour';
  // Which service issued the token
  const issuer = config.get('authentication.token.issuer');
  // Which service is the token intended for
  const audience = config.get('authentication.token.audience');
  // The signing key for signing the token
  const secret = config.get('authentication.token.secret');

  const token = jwt.sign({...payload}, secret, {
    expiresIn: expiresIn,
    audience: audience,
    issuer: issuer,
    subject: userId,
  });

  return token;
}

const CookieOptions = {
  maxAge: 1000 * 60 * 15, // would expire after 15 minutes
  httpOnly: true, // The cookie only accessible by the web server
  signed: false, // Indicates if the cookie should be signed
};

const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const applyForOffer = async (inUser, cvFile, applicationDetails, loginDetails) => {
  winston.info('Application processing started', {
    tag: 'C001-S',
    inUser,
    cvFile,
    offer: applicationDetails,
  });

  const {email} = inUser;

  const exitingCandidate = await Candidate.findOne({
    email,
  });

  const userExternalId = (exitingCandidate && exitingCandidate.eid) || uuidv4();

  const applicationExternalId = uuidv4();
  const applicationDate = new Date();

  const candidate = {
    eid: userExternalId,
    ...inUser,
    loginDetails,
    $addToSet: {
      applications: {
        eid: applicationExternalId,
        userDetails: inUser,
        ...applicationDetails,
        applicationDate,
        infoSend: false,
        loginDetails,
        documents: [
          {
            type: 'CV',
            path: cvFile.path,
            originalName: cvFile.originalname,
            uploadDate: applicationDate,
          },
        ],
      },
    },
  };

  const savedCandidate = await Candidate.findOneAndUpdate(
    {
      email,
    },
    candidate,
    {
      new: true,
      upsert: true,
    }
  );

  winston.info('Application saved', {
    tag: 'C001-E',
    candidate: {
      id: savedCandidate._id,
      eid: savedCandidate.eid,
      email: savedCandidate.email,
      applicationExternalId,
    },
  });

  return {
    savedCandidate,
    applicationExternalId,
  };
};

const getUserFromForm = form => {
  const {firstName, lastName, email, phone, isRodo, isRegulations, rememberMe} = form;

  return {
    firstName,
    lastName,
    email,
    phone,
    isRodo,
    isRegulations,
    rememberMe,
  };
};

const fetchApplicationsById = async (userId, applicationId) => {
  return await Candidate.aggregate([
    {
      $match: {id: userId},
    },
    {
      $unwind: '$applications',
    },
    {
      $match: {'applications.eid': applicationId},
    },
    {
      $project: {
        _id: 0,
        id: '$applications.eid',
        offerId: '$applications.offerId',
        firstName: '$applications.userDetails.firstName',
        lastName: '$applications.userDetails.lastName',
        email: '$applications.userDetails.email',
        phone: '$applications.userDetails.phone',
        isRodo: '$applications.userDetails.isRodo',
        rememberMe: '$applications.userDetails.rememberMe',
        isRegulations: '$applications.userDetails.isRegulations',
        confirmed: '$applications.confirmed',
        documents: {
          $map: {
            input: '$applications.documents',
            as: 'document',
            in: {
              name: '$$document.originalName',
              type: '$$document.type',
            },
          },
        },
        messages: {
          $map: {
            input: '$applications.messages',
            as: 'message',
            in: {
              text: '$$message.text',
            },
          },
        },
      },
    },
  ]);
};

// Send an email after confirm an application
const sendEmail = (email, applicationExternalId) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: 1025,
  });

  // Send an message
  const mailOptions = {
    from: `support <info@it-talents.pl>`,
    to: email,
    subject: `Aplikowałeś na ofertę ${applicationExternalId}`,
    html: `
        To reset your account password, click this link
        <a href="http://localhost:3000/password/update/">Reset Account Password</a>
      `,
  };

  return transporter.sendMail(mailOptions, (err, data) => {
    if (err) throw err;
  });
};

module.exports = {
  login: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.login.token');
    return res.json({msg: 'OK'});
  },

  loginFacebook: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.login.facebook.callback');
    const user = req.user;

    winston.info(JSON.stringify(user), {user, description: 'User login with facebook'});

    res.cookie('cicada-session', generateAccessToken(user.eid, user.currentLoginDetails), CookieOptions);

    return res.redirect(config.get('frontend.offerUrl'));
  },

  loginGoogle: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.google');
    return res.json({msg: 'OK'});
  },

  loginLinkedin: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.linkedin');
    return res.json({msg: 'OK'});
  },

  getCandidate: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.get');
    return res.json({user: req.user});
  },

  getApplications: async (req, res) => {
    statsd.client.increment('cicada.server.candidates.applications.get');
    return res.json({msg: 'OK'});
  },

  // Get current candidate
  getCurrentCandidate: async (req, res) => {
    const userId = req.user.applications[0];
    const appId = req.params.applicationId;

    const confirmData = {
      documentName: userId.documents[0].originalName,
      firstName: userId.userDetails.firstName,
      lastName: userId.userDetails.lastName,
      email: userId.userDetails.email,
    };

    winston.info('Get Application', {
      userId,
      appId,
    });

    res.send(confirmData);
  },

  // TODO verify rodo and regulations acceptance. Save in DB.
  submitApplicationFromForm: asyncMiddleware(async (req, res) => {
    statsd.client.increment('cicada.server.candidates.applications.submit.form');
    const {firstName, lastName, email, phone, offerId, isRodo, isRegulations, rememberMe} = req.body;

    const userForm = {
      firstName,
      lastName,
      email,
      phone,
      isRodo,
      isRegulations,
      rememberMe,
    };

    const loginDetails = {
      loginType: 'FORM',
      loginId: uuidv4(),
      facebookId: null,
      emailVerified: false,
    };

    const applicationDetails = {
      offerId,
    };

    const {savedCandidate, applicationExternalId} = await applyForOffer(
      userForm,
      req.file,
      applicationDetails,
      loginDetails
    );

    if (rememberMe == 'true') {
      res.cookie('cicada-session', generateAccessToken(savedCandidate.eid, {loginDetails}), CookieOptions);
    }

    res.send({
      userId: savedCandidate.eid,
      applicationId: applicationExternalId,
    });
  }),

  // Session
  submitApplicationFromWithActiveSession: asyncMiddleware(async (req, res) => {
    statsd.client.increment('cicada.server.candidates.applications.submit.session');
    // TODO override session values with form values
    const userForm = getUserFromForm(req.body);

    const {offerId} = req.body;

    const applicationDetails = {
      offerId,
    };

    const {email} = req.user;
    const {firstName, lastName, phone, isRodo, isRegulations, rememberMe} = userForm;

    winston.debug('User from session', {user: req.user});

    const {savedCandidate, applicationExternalId} = await applyForOffer(
      Object.assign({
        firstName,
        lastName,
        email,
        phone,
        isRodo,
        isRegulations,
        rememberMe,
      }),
      req.file,
      applicationDetails,
      req.user.currentLoginDetails
    );

    res.send({
      userId: savedCandidate.eid,
      applicationId: applicationExternalId,
    });
  }),

  // Get application
  getApplication: asyncMiddleware(async (req, res) => {
    const {applicationId} = req.params;
    const userId = req.user.id;

    const applications = await fetchApplicationsById(userId, applicationId);

    const applictionsNo = R.length(applications);
    if (applictionsNo == 1) {
      res.send({
        ...R.head(applications),
      });
    } else if (applictionsNo == 0) {
      throw {
        status: 404,
        message: 'Application with given id not found',
      };
    } else {
      throw {
        status: 500,
        message: 'More then one application found with given id',
      };
    }
  }),

  // Confirm application
  confirmApplication: asyncMiddleware(async (req, res) => {
    const {applicationId} = req.params;
    const {userId, email} = req.user;

    await Candidate.updateOne(
      {
        id: req.user.id,
        'applications.eid': applicationId,
      },
      {
        $set: {
          'applications.$.confirmed': true,
        },
      },
      {multi: true},
      (err, raw) => {
        if (err) {
          winston.error('Error while application confirmation', {
            err,
          });
        } else {
          winston.info('Application confirmed', {
            raw,
          });
        }
      }
    );

    const applications = await fetchApplicationsById(userId, applicationId);
    const applictionsNo = R.length(applications);

    if (applictionsNo == 1) {
      sendEmail(email, applicationId);
      res.send({
        ...R.head(applications),
      });
    } else if (applictionsNo == 0) {
      throw {
        status: 404,
        message: 'Application with given id not found',
      };
    } else {
      throw {
        status: 500,
        message: 'More then one application found with given id',
      };
    }
  }),

  // Logout
  logout: asyncMiddleware(async (req, res) => {
    await res.clearCookie('cicada-session');
    res.status(200).send();
  }),
};
