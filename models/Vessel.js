const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;
const NameModel = require("./NameModel");

delete NameModel._id;

const TransactionSchema = new Schema({
  ...NameModel,
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

TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("vessels", TransactionSchema);
