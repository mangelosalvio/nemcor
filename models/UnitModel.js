const mongoose = require("mongoose");
const CustomerModel = require("./CustomerModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  customer: {
    ...CustomerModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
};
