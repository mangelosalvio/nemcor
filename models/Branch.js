const mongoose = require("mongoose");
const BranchModel = require("./BranchModel");
const mongoose_paginate = require("mongoose-paginate");
const UserLogSchema = require("./UserLogSchema");
const Schema = mongoose.Schema;

delete BranchModel._id;

const ModelSchema = new Schema({
  ...BranchModel,
  logs: [
    {
      user: UserLogSchema,
      datetime: Date,
      log: String,
    },
  ],
  deleted: {
    date: Date,
    user: UserLogSchema,
  },
});

ModelSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("branches", ModelSchema);
