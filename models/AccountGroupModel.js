const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  account_group_id: Number,
  sgroup: String,
  account_group_type: String,
};
