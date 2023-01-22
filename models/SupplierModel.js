const mongoose = require("mongoose");
const LocationModel = require("./LocationModel");
const UnitProductModel = require("./UnitProductModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  contact_no: String,
};
