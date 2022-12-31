const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const BankModel = require("./BankModel");

const CustomerModel = require("./CustomerModel");
const NameModel = require("./NameModel");
const SupplierModel = require("./SupplierModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema({
  company: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  department: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  cv_no: Number,
  date: Date,
  supplier: {
    ...SupplierModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  bank: {
    ...BankModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  payment_type: String,
  account_name: String,
  check_date: Date,
  check_no: String,
  payment_amount: Number,

  transfer_date: Date,

  expected_payment_amount: Number,
  check_status: {
    status: String,
    user: Object,
    date: Date,
  },

  remarks: String,

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

  purchase_order_items: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      po_no: Number,
      date: Date,
      due_date: Date,
      supplier: {
        ...SupplierModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
      supplier_delivery_type: String,
      delivery_type: String,
      external_po_no: String,
      external_so_no: String,
      total_amount: Number,
      payment_amount: Number,
      balance: Number,
    },
  ],
  debit_memo_items: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      dm_no: Number,
      date: Date,
      supplier: {
        ...SupplierModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
      total_amount: Number,
      debit_amount: Number,
      balance: Number,
    },
  ],

  additional_rate: Number,
  additional_value: Number,
  additional_rate_remarks: String,
  additional_value_remarks: String,

  deduct_rate: Number,
  deduct_value: Number,
  deduct_rate_remarks: String,
  deduct_value_remarks: String,

  status: {
    approval_status: String,
    datetime: Date,
    user: Object,
  },
  total_amount: Number,
  total_debit_amount: Number,
  net_amount: Number,
  total_balance: Number,
  total_payment_amount: Number,
  total_debit_amount: Number,

  opening_balance: Number,
  opening_balance_payment: Number,
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("check_vouchers", TableSchema);
