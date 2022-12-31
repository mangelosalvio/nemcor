const { default: mongoose } = require("mongoose");
const ProductModel = require("./ProductModel");
const UnitModel = require("./UnitModel");
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");

module.exports = [
  {
    stock: {
      ...ProductModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    unit_of_measure: {
      ...UnitOfMeasureSchema,
      _id: mongoose.Schema.Types.ObjectId,
    },
    quantity: Number,
    confirmed_quantity: Number,
    price: Number,
    freight_per_unit: Number,
    freight: Number,
    amount: Number,
    unit: {
      ...UnitModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    is_open_quantity: Boolean, //used at Sales Order for quantity modification at Tanker Scheduling
  },
];
