const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const constants = require("./../config/constants");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const TankerModel = require("./TankerModel");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  ww_no: Number,

  dr_no: String, //Delivery Receipt
  dn_no: String, //Delivery Note

  company: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  department: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  purchase_order: {
    _id: mongoose.Schema.Types.ObjectId,
    po_no: Number,
    supplier_delivery_type: String,
    area: {
      ...LocationModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
  },
  supplier: {
    ...SupplierModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  //Delivery Type is Pickup
  tanker: {
    ...TankerModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  //Delivery Type is Company Delivered
  warehouse: {
    ...WarehouseModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  date: Date,
  due_date: Date,

  remarks: String,
  items: [
    {
      ...ItemsSchema[0],
      po_detail_id: mongoose.Schema.Types.ObjectId,
      withdrawn: Number, //coming from Tanker withdrawals and Returns
      balance: Number,
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

  total_amount: Number, //net amount
  total_discount_amount: Number,
  gross_amount: Number,
});

TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("supplier_withdrawals", TransactionSchema);
