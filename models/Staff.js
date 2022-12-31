const mongoose = require("mongoose");
const BranchModel = require("./BranchModel");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  staff_id: Number,
  name: String,
  staff_code: String,
  class: String,
  branch: {
    ...BranchModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

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
ModelSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("staffs", ModelSchema);
