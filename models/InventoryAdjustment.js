const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");
const BranchModel = require("./BranchModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const UserLogSchema = require("./UserLogSchema");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    adj_no: Number,
    date: Date,
    branch_reference: String,
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    reference: String,
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
    total_amount: Number,
    total_discount_amount: Number,
    gross_amount: Number,

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
module.exports = mongoose.model("inventory_adjustments", TableSchema);
