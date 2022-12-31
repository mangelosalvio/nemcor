const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const Schema = mongoose.Schema;

const ProductionSchema = new Schema({
  production_no: Number,
  date: Date,
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
  },
  remarks: String,
  consumed_items: [
    {
      stock: {
        _id: mongoose.Schema.Types.ObjectId,
        ...ProductModel,
      },

      case_quantity: Number,
      quantity: Number,

      case_price: Number,
      price: Number,

      amount: Number,
    },
  ],

  produced_items: [
    {
      stock: {
        _id: mongoose.Schema.Types.ObjectId,
        ...ProductModel,
      },

      case_quantity: Number,
      quantity: Number,

      case_price: Number,
      price: Number,

      amount: Number,
    },
  ],
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],

  deleted: {
    date: Date,
    user: Object,
  },

  status: {
    approval_status: String,
    datetime: Date,
    user: Object,
  },

  total_consumed_amount: Number,
  total_produced_amount: Number,
});

ProductionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("production", ProductionSchema);
