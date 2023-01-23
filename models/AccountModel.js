const mongoose = require("mongoose");
const AccountGroupModel = require("./AccountGroupModel");
const BankModel = require("./BankModel");
const BranchModel = require("./BranchModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  contact_no: String,
  business_style: String,
  tin: String,

  terms: Number,

  account_type: String,
  pricing_type: String, //check if retail or dealer price
};
