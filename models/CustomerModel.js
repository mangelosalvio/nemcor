const mongoose = require("mongoose");
const AgentModel = require("./AgentModel");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  area: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  location: {
    _id: mongoose.Schema.Types.ObjectId,
    ...LocationModel,
  },
  areas: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      ...LocationModel,
    },
  ],
  contact_no: String,
  agent: {
    _id: mongoose.Schema.Types.ObjectId,
    ...AgentModel,
  },
  terms: Number,
};
