const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const LocationModel = require("./LocationModel");
const Schema = mongoose.Schema;

delete LocationModel._id;

const TableSchema = new Schema({
  ...LocationModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("locations", TableSchema);
