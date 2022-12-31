const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const Schema = mongoose.Schema;

const PurchaseReturnSchema = new Schema({
  pr_no: Number,
  date: Date,
  supplier: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
    owner: String,
    contact_no: String,
    terms: String,
  },
  remarks: String,
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
  },
  items: [
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
  total_amount: Number,
  total_credit_amount: Number,
});

PurchaseReturnSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("purchase_returns", PurchaseReturnSchema);
