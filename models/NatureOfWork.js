const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;
const NatureOfWorkModel = require("./NatureOfWorkModel");

delete NatureOfWorkModel._id;

const ModelSchema = new Schema({
  ...NatureOfWorkModel,
  deleted: {
    date: Date,
    user: Object,
  },
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

ModelSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("nature_of_works", ModelSchema);
