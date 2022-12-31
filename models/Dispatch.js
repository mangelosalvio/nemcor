const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const CustomerModel = require("./CustomerModel");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    ds_no: Number,
    date: Date,
    customer: {
      _id: mongoose.Schema.Types.ObjectId,
      ...CustomerModel,
    },
    warehouse: {
      _id: mongoose.Schema.Types.ObjectId,
      ...WarehouseModel,
    },
    remarks: String,
    pricing_option: String,
    items: [
      {
        stock: {
          _id: mongoose.Schema.Types.ObjectId,
          ...ProductModel,
        },
        quantity: Number,
        price: Number,
        amount: Number,
        bundle: Number,
        loading_status: {
          type: String,
          default: "For Loading",
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
    bundle_status: {
      type: String,
      default: "Unbundled",
    },
    total_amount: Number,
    total_discount_amount: Number,
    gross_amount: Number,

    printed: {
      user: Object,
      datetime: Date,
    },

    created_by: UserSchema,
    last_updated_by: UserSchema,
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
module.exports = mongoose.model("dispatches", TableSchema);
