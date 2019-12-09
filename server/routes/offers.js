const express = require('express');

const controller = require('../controllers/offers/offers');

const getRouting = () => {
  const router = express.Router();

  router.get('/:offerId', controller.getOffer);

  return router;
};

module.exports = {
  getRouting,
};
