const axios = require('axios');
const uuid = require('uuid/v4');

const statsd = require('../../config/statsd');
const winston = require('../../config/winston');

const getErrorForStatus = (status) => {
  if ((status) => 400 && status < 500) {
    return 'BAD REQUEST';
  } else {
    return 'INTERNAL SERVER ERROR';
  }
};

const getPlatformOffer = (offerId) => {
  statsd.client.increment('cicada.server.platform.offer.fetch');
  return axios.get(
    `https://nowe.it-leaders.pl/api_v1/recrutation/gf01jdi1f127fg01292rvg1ryh0912hr01b2irvb/${offerId}`
  );
};

const getPlatformEmployer = (employerId) => {
  statsd.client.increment('cicada.server.platform.employer.fetch');
  return axios.get(
    `https://nowe.it-leaders.pl/api_v1/employer/hf09fu2g3gh3fasdgauisf83927fg8hqouwbui/${employerId}`
  );
};

const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const getOffer = asyncMiddleware(async (req, res) => {
  statsd.client.increment('cicada.server.offers.get');

  const { offerId } = req.params;

  const offerResponse = await getPlatformOffer(offerId);

  const { status, data: offerDetailsResponse } = offerResponse;

  const { error } = offerDetailsResponse;

  if (error) {
    // TODO Throw error to be catched in error handler
    const errorId = uuid();

    winston.error('Offer not returned from platform', {
      offerId,
      errorId,
      responseData: offerDetailsResponse,
      response: offerResponse,
    });

    res.status = 404;
    res.json({
      id: errorId,
      timestamp: new Date(),
      status: status,
      error: getErrorForStatus(status),
      exception: 'PLATFORM_CONNECTION_ERROR',
      message: error,
      path: 'api/offers/getOffer',
    });
  } else {
    winston.info('Fetched offer from platform', {
      offerId,
      status,
      details: {
        offerId: offerDetailsResponse.offerId,
        name: offerDetailsResponse.nazwa,
      },
    });

    const offerDetails = {
      name: offerDetailsResponse.nazwa,
      description: offerDetailsResponse.zakres_zadan,
      active: offerDetailsResponse.active === 't',
      employerId: offerDetailsResponse.id_pracodawcy,
    };

    const {
      status: employerStatus,
      data: employerDetailsResponse,
    } = await getPlatformEmployer(offerDetails.employerId);

    const employerDetails = {
      name: employerDetailsResponse.nazwa,
      logo: employerDetailsResponse.logo,
      www: employerDetailsResponse.www,
    };

    res.json({
      offerId: offerId,
      ...offerDetails,
      employerDetails,
    });
  }
});

module.exports = {
  getOffer,
};
