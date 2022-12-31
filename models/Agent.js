const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AgentModel = require("./AgentModel");
const Schema = mongoose.Schema;

delete AgentModel._id;

const TableSchema = new Schema({
  ...AgentModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("agents", TableSchema);
