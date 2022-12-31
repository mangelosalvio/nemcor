const mongoose = require("mongoose");
module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String, //description
  unit: String,
  packaging: Number,
  is_imported: Boolean,
};
