const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    rr_no: Number,
    date: Date,
    warehouse: {
      _id: mongoose.Schema.Types.ObjectId,
      ...WarehouseModel,
    },

    supplier: {
      ...SupplierModel,
      _id: mongoose.Schema.Types.ObjectId,
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
    total_discount_amount: Number,
    gross_amount: Number,

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

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("stocks_receiving", TableSchema);
