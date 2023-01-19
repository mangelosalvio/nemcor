const mongoose = require("mongoose");
const BranchModel = require("./BranchModel");
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
  wholesale_price: Number,

  branch_pricing: [
    {
      branch: {
        ...BranchModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
      price: Number,
      wholesale_price: Number,
    },
  ],

  unit_of_measure: String,
  product_type: String, //inventoriable or non-inventoriable
};
