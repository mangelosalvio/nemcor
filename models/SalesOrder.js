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
    so_no: Number,
    date: Date,
    date_needed: Date,
    company: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    customer: {
      ...CustomerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    delivery_area: {
      ...LocationModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    supplier: {
      ...SupplierModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    delivery_type: String, //Company delivered, Delivery by Supplier, Pickup by Customer

    po_no: Number,

    purchase_order: {
      _id: mongoose.Schema.Types.ObjectId,
      po_no: Number,
      supplier: {
        ...SupplierModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
    },

    total_amount: Number,
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
    remarks: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("sales_orders", TableSchema);
