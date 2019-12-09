const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicationDocumentSchema = new Schema({
  eid: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    required: true,
  },
});

const MessageSchema = new Schema({
  pid: {
    type: String,
    required: false,
  },
  eid: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  sendDate: {
    type: Date,
    required: true,
  },
  sender: {
    type: String,
    required: true,
  },
});

const UserDetails = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    uniqueCaseInsensitive: true,
  },
  phone: {
    type: String,
    required: false,
  },
  isRegulations: {
    type: Boolean,
    required: true,
  },
  isRodo: {
    type: Boolean,
    required: true,
  },
  rememberMe: {
    type: Boolean,
    required: false,
  },
});

const LoginDetails = new Schema({
  type: {
    type: String,
    required: true,
  },
  loginId: {
    type: String,
    required: true,
  },
  facebookId: {
    type: String,
    required: false,
  },
  emailVerified: {
    type: Boolean,
    required: true,
  },
});

const ApplicationSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  loginDetails: {
    type: LoginDetails,
    required: true,
  },
  pid: {
    type: String,
    required: false,
  },
  eid: {
    type: String,
    required: true,
  },
  offerId: {
    type: String,
    required: true,
  },
  applicationDate: {
    type: Date,
    required: true,
  },
  confirmed: {
    type: Boolean,
    required: false,
    default: false,
  },
  accepted: {
    type: Boolean,
    required: false,
  },
  infoSend: {
    type: Boolean,
    required: true,
  },
  userDetails: {
    type: UserDetails,
    required: true,
  },
  documents: [ApplicationDocumentSchema],
  messages: [MessageSchema],
});

const CandidateSchema = new Schema(
  {
    pid: {
      type: String,
      required: false,
    },
    eid: {
      type: String,
      required: true,
      index: true,
    },
    facebookId: {
      type: String,
      required: false,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      uniqueCaseInsensitive: true,
    },
    phone: {
      type: String,
      required: false,
    },

    loginDetails: {
      type: LoginDetails,
      required: true,
    },
    applications: [ApplicationSchema],
  },
  {timestamps: true}
);

const Candidate = mongoose.model('candidates', CandidateSchema);

module.exports = {
  Candidate,
};
