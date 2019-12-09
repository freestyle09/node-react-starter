const passport = require('passport');
const passportJWT = require('passport-jwt');
const FacebookStrategy = require('passport-facebook').Strategy;
const uuidv4 = require('uuid/v4');

const config = require('config');
const {Candidate} = require('./models/Candidate');
const winston = require('./config/winston');
const statsd = require('./config/statsd');

var cookieExtractor = function(req) {
  var token = null;
  winston.debug('Cookie extractor', {
    cookies: req.cookies,
  });
  if (req && req.cookies) token = req.cookies['cicada-session'];
  return token;
};

const getJwtCandidateStrategy = (extractor, tag = 'login') =>
  new passportJWT.Strategy(
    {
      jwtFromRequest: extractor,
      secretOrKey: config.get('authentication.token.secret'),
    },
    (jwtPayload, done) => {
      statsd.client.increment('cicada.server.passport.session.' + tag);
      Candidate.findOne({eid: jwtPayload.sub}).then(candidate => {
        if (candidate) {
          const info = {loginDetails: jwtPayload.loginDetails};

          return done(
            null,
            {
              ...candidate._doc,
              currentLoginDetails: jwtPayload.loginDetails,
            },
            info
          );
        } else {
          return done({message: 'Candidate not found in db'}, null);
        }
      });
    }
  );

const setup = () => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use('jwtCookie', getJwtCandidateStrategy(cookieExtractor, 'cookie'));
  passport.use('jwtInUrl', getJwtCandidateStrategy(passportJWT.ExtractJwt.fromUrlQueryParameter('token'), 'jwt'));

  passport.use(
    new FacebookStrategy(
      {
        clientID: config.get('facebook.app_id'),
        clientSecret: config.get('facebook.app_secret'),
        callbackURL: config.get('facebook.callback'),
        profileFields: ['id', 'emails', 'name', 'verified'],
      },
      function(accessToken, refreshToken, profile, done) {
        statsd.client.increment('cicada.server.candidates.login.facebook');

        const loginDetails = {
          loginType: 'SOCIAL',
          loginId: uuidv4(),
          facebookId: profile.facebookId,
          emailVerified: true,
        };

        winston.info('User profile arrived', JSON.stringify(profile));

        const email = profile.emails && profile.emails[0].value;
        if (email) {
          const candidateFromFacebook = {
            eid: uuidv4(),
            facebookId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email,
          };

          Candidate.findOneAndUpdate(
            {
              email,
            },
            candidateFromFacebook,
            {
              new: true,
              upsert: true,
            }
          )
            .then(candidate => {
              if (candidate) {
                statsd.client.increment('cicada.server.candidates.login.facebook.success');
                return done(null, {...candidate._doc, currentLoginDetails: loginDetails});
              } else {
                statsd.client.increment('cicada.server.candidates.login.facebook.error');
                return done({message: 'Candidate not found in db'}, null);
              }
            })
            .catch(e => {
              statsd.client.increment('cicada.server.candidates.login.facebook.error');
              return done({message: 'Error while fatching candidate from DB', originalException: e});
            });
        } else {
          return done({message: 'Email address not provided from facebook', status: 400});
        }
      }
    )
  );
};

module.exports = {
  setup,
};
