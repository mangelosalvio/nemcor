const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const CustomerModel = require("./CustomerModel");
const EmployeeModel = require("./EmployeeModel");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const SupplierModel = require("./SupplierModel");
const TankerModel = require("./TankerModel");
const UnitModel = require("./UnitModel");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    company: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    sales_order: {
      _id: mongoose.Schema.Types.ObjectId,
      so_no: Number,
    },
    sales_order_cement: {
      _id: mongoose.Schema.Types.ObjectId,
      so_no: Number,
    },

    si_no: Number,
    tanker_withdrawal: {
      _id: mongoose.Schema.Types.ObjectId,
      tw_no: Number,
    },
    tanker: {
      ...TankerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    driver: {
      ...EmployeeModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    dr_no: Number,
    external_dr_ref: String,
    date: Date,
    due_date: Date,
    delivery_area: {
      ...LocationModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    customer: {
      ...CustomerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    delivery_type: String, //Company delivered, Delivery by Supplier, Pickup by Customer

    unit: {
      ...UnitModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    purchase_order: {
      _id: mongoose.Schema.Types.ObjectId,
      po_no: Number,
      supplier: {
        ...SupplierModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
    },

    total_amount: Number,
    total_payment_amount: Number,
    items: [{ ...ItemsSchema[0] }],
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

    release_no: String,

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
module.exports = mongoose.model("delivery_receipts", TableSchema);
