const mongoose = require("mongoose");
const CategoryModel = require("./CategoryModel");
const SupplierModel = require("./SupplierModel");
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");
const UnitProductModel = require("./UnitProductModel");

module.exports = {
  name: String,
  category: {
    ...CategoryModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  sku: String,
  price: Number, //retail price

  unit_of_measures: [{ ...UnitOfMeasureSchema, is_default: Boolean }],

  description: String,
  taxable: Boolean,
};
