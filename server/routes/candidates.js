const express = require('express');
const passport = require('passport');

const candidatesController = require('../controllers/candidates/candidates');

const candidatesRouter = uploader => {
  const router = express.Router();

  // @route   GET api/candidates/login
  // @desc    Login candidate by token send to email
  // @access  Public with valid access token
  router.get('/login', passport.authenticate('jwtInUrl'), candidatesController.login);

  // @route   GET api/candidates/login/facebook
  // @desc    Login candidate by facebook
  // @access  Public
  router.get('/login/facebook', passport.authenticate('facebook', {scope: ['email'], state: '12345'}));
  router.get(
    '/login/facebook/callback',
    passport.authenticate('facebook', {failureRedirect: '/login'}),
    candidatesController.loginFacebook
  );

  // @route   GET api/candidates/login/google
  // @desc    Login candidate by google
  // @access  Public
  router.get('/login/google', candidatesController.loginGoogle);

  // @route   GET api/candidates/login/linkedins
  // @desc    Login candidate by linkedin
  // @access  Public
  router.get('/login/linkedin', candidatesController.loginLinkedin);

  // @route   GET api/candidates/current
  // @desc    Return authorized candidate depending on jwt
  // @access  Private
  router.get('/current', passport.authenticate('jwtCookie'), candidatesController.getCandidate);

  // @route   GET api/candidates/current/logout
  // @desc    Remove cookies depending on jwt
  // @access  Private
  router.get('/current/logout', passport.authenticate('jwtCookie'), candidatesController.logout);

  // @route   GET api/applications
  // @desc    Get user applications
  // @access  Private
  router.get('/current/applications', passport.authenticate('jwtCookie'), candidatesController.getApplications);

  // @route   POST api/applications
  // @desc    Send application
  // @access  Public
  router.post('/applications/form', uploader.single('cv'), candidatesController.submitApplicationFromForm);

  // @route   POST api/applications
  // @desc    Send application
  // @access  Public
  router.post(
    '/applications/session',
    passport.authenticate('jwtCookie'),
    uploader.single('cv'),
    candidatesController.submitApplicationFromWithActiveSession
  );

  // @route   GET api/applications
  // @desc    Fetch application by id
  // @access  Secured
  router.get(
    '/current/applications/:applicationId',
    passport.authenticate('jwtCookie'),
    candidatesController.getApplication
  );

  // @route   GET api/applications/:appId/confirm
  // @desc    Confirm application by id
  // @access  Secured
  router.get(
    '/current/applications/:applicationId/confirm',
    passport.authenticate('jwtCookie'),
    candidatesController.confirmApplication
  );

  return router;
};

module.exports = {
  router: candidatesRouter,
};
