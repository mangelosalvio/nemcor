const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");
const BranchModel = require("./BranchModel");
const CustomerModel = require("./CustomerModel");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const SupplierModel = require("./SupplierModel");
const UserLogSchema = require("./UserLogSchema");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    cm_no: Number,
    date: Date,
    account: {
      ...AccountModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    total_amount: Number,
    total_credit_amount: Number,
    reason: String,
    remarks: String,
    branch_reference: String,
    sales_return: {
      return_no: Number,
      _id: mongoose.Schema.Types.ObjectId,
      date: Date,
      branch_reference: String,
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
TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("credit_memos", TableSchema);
