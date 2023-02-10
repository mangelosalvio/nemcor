const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  company_code: String,
  logo: {
    fieldname: String,
    originalname: String,
    encoding: String,
    mimtype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number,
  },
};
