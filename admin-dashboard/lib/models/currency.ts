const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  country: {
    type: String,
    required: true
  },
  minAmount: {
    type: Number,
    required: true
  },
  maxAmount: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  emoji: String
});

module.exports = mongoose.model('Currency', currencySchema);