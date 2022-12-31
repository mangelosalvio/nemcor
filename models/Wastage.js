const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const Schema = mongoose.Schema;

const WastageSchema = new Schema({
  wastage_no: Number,
  date: Date,
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
  },
  remarks: String,
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

      received_case_quantity: {
        type: Number,
        default: 0,
      },

      received_quantity: {
        type: Number,
        default: 0,
      },
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
});

WastageSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("wastages", WastageSchema);
