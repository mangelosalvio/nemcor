const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const TankerModel = require("./TankerModel");
const Schema = mongoose.Schema;

delete TankerModel._id;

const ModelSchema = new Schema({
  ...TankerModel,
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
module.exports = mongoose.model("tankers", ModelSchema);
