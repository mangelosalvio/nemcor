const mongoose = require("mongoose");
const UnitProductModel = require("./UnitProductModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  plate_no: String,
  capacity: Number,
  compartment: String,
  assignment: String,
  location: String,
  type_of_use: String,
};
