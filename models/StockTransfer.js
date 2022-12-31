const mongoose = require("mongoose");
const mongooose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const Schema = mongoose.Schema;

const StockTransferSchema = new Schema({
  stock_transfer_no: Number,
  date: Date,
  remarks: String,
  from_warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
  },
  to_warehouse: {
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

      approved_case_quantity: Number,
      approved_quantity: Number,

      total_released_case_quantity: Number,
      total_released_quantity: Number,

      total_received_case_quantity: Number,
      total_received_quantity: Number,
    },
  ],

  total_amount: Number,
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
  printed: {
    user: Object,
    datetime: Date,
  },
});

StockTransferSchema.plugin(mongooose_paginate);
module.exports = mongoose.model("stock_transfers", StockTransferSchema);
