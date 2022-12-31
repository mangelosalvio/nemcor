const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const constants = require("./../config/constants");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const Schema = mongoose.Schema;

const PurchaseOrderSchema = new Schema({
  po_no: Number,
  date: Date,
  date_needed: Date,

  external_po_no: String,
  external_so_no: String,

  company: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  department: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  supplier: {
    ...SupplierModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  area: {
    ...LocationModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  supplier_delivery_type: String,
  remarks: String,
  items: ItemsSchema,
  invoice_no: String,
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

  po_status: {
    type: String,
    default: constants.PO_STATUS_PENDING,
  },

  total_amount: Number, //net amount
  total_discount_amount: Number,
  gross_amount: Number,

  total_payment_amount: Number,
});

PurchaseOrderSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("purchase_orders", PurchaseOrderSchema);
