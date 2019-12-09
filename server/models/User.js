// For study only
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: String,
  age: Number,
});

const User = mongoose.model('users', UserSchema);
module.exports = {User};
