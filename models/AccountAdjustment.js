const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const constants = require("./../config/constants");
const Schema = mongoose.Schema;

const AccountAdjustmentSchema = new Schema({
  account_adjustment_no: Number,
  date: Date,
  account: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    company_name: String,
  },
  remarks: String,
  amount: Number,

  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],

  deleted: {
    date: Date,
    user: Object,
  },
});

AccountAdjustmentSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("account_adjustments", AccountAdjustmentSchema);
