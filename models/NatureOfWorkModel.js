const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  rate: Number,
  work_type: String, //INDIVIDUAL, GROUP
  is_milling: Boolean,
};
