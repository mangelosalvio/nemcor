const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  company_code: String,
};
