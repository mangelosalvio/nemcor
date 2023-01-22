const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");
const BranchModel = require("./BranchModel");
const ProductModel = require("./ProductModel");
const UserLogSchema = require("./UserLogSchema");
const Schema = mongoose.Schema;

const PurchaseReturnSchema = new Schema(
  {
    pr_no: Number,
    date: Date,
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    account: {
      ...AccountModel,
      _id: mongoose.Schema.Types.ObjectId,
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
        user: UserLogSchema,
        datetime: Date,
        log: String,
      },
    ],
    deleted: {
      date: Date,
      user: UserLogSchema,
    },
    status: {
      approval_status: String,
      datetime: Date,
      user: UserLogSchema,
    },
    printed: {
      user: UserLogSchema,
      datetime: Date,
    },
    total_amount: Number,
    total_credit_amount: Number,
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

PurchaseReturnSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("purchase_returns", PurchaseReturnSchema);
