const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const BankModel = require("./BankModel");
const Schema = mongoose.Schema;

delete BankModel._id;

const TableSchema = new Schema({
  ...BankModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("banks", TableSchema);
