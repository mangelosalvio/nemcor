const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  price: Number,
  category: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
  },
  meat_types: [String],
  sku: String,
  case_uom: String,
  uom: String,
  description: String,
  taxable: Boolean,
  type_of_senior_discount: String,
  pieces_in_case: Number,
  reorder_level: Number,
};
