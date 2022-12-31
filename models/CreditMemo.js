const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const CustomerModel = require("./CustomerModel");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const SupplierModel = require("./SupplierModel");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    cm_no: Number,
    date: Date,
    customer: {
      ...CustomerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    total_amount: Number,
    total_credit_amount: Number,
    items: ItemsSchema,
    deleted: {
      user: Object,
      datetime: Date,
    },
    logs: [
      {
        user: Object,
        datetime: Date,
        log: String,
      },
    ],

    status: {
      approval_status: String,
      datetime: Date,
      user: Object,
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
