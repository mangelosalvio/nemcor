const mongoose = require("mongoose");
const BranchModel = require("./BranchModel");

module.exports = {
  staff_id: Number,
  name: String,
  staff_code: String,
  class: String,
  branch: {
    ...BranchModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  _id: mongoose.Schema.Types.ObjectId,
};
