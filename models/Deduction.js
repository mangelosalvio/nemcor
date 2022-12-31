const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  name: String,
  sequence: Number,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});
TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("deductions", TransactionSchema);
