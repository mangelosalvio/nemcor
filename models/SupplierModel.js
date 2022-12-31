const mongoose = require("mongoose");
const LocationModel = require("./LocationModel");
const UnitProductModel = require("./UnitProductModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  owner: String,
  contact_no: String,
  terms: String,
  terms_in_days: Number,
  product_categories: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
  ],
  areas: [
    {
      ...LocationModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
  ],

  opening_balance: Number,
  opening_balance_date: Date,
};
