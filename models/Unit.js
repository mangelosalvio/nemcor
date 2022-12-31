const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const UnitModel = require("./UnitModel");
const Schema = mongoose.Schema;

delete UnitModel._id;

const TableSchema = new Schema({
  ...UnitModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("units", TableSchema);
