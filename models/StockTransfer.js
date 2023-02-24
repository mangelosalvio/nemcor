const mongoose = require("mongoose");
const mongooose_paginate = require("mongoose-paginate");
const BranchModel = require("./BranchModel");
const ProductModel = require("./ProductModel");
const Schema = mongoose.Schema;

const StockTransferSchema = new Schema(
  {
    stock_transfer_no: Number,
    branch_reference: String,
    date: Date,
    invoice_date: Date,
    remarks: String,
    reference: String,
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    to_branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    driver: String,
    plate_no: String,

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
    created_at: Date,
    updated_at: Date,
    created_by: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    updated_by: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

StockTransferSchema.plugin(mongooose_paginate);
module.exports = mongoose.model("stock_transfers", StockTransferSchema);
