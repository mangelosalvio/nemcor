const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");

const TransactionUnitOfMeasureSchema = { ...UnitOfMeasureSchema };
delete TransactionUnitOfMeasureSchema._id;

const TransactionSchema = new Schema({
  ...TransactionUnitOfMeasureSchema,
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
module.exports = mongoose.model("unit_of_measures", TransactionSchema);
