const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");
const BankModel = require("./BankModel");

const CustomerModel = require("./CustomerModel");
const NameModel = require("./NameModel");
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
  collection_no: Number,
  date: Date,
  customer: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
    owner: String,
    contact_no: String,
    terms: String,
  },

  wtax_type: String, //Rate or value
  wtax_type_value: Number,
  wtax_amount: Number,

  bank: {
    ...BankModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  payments: [
    {
      payment_method: String,
      amount: Number,
      check_date: Date,
      check_no: String,
      bank: String,
      reference: String,
    },
  ],

  transfer_date: Date,

  expected_payment_amount: Number,

  payment_status: {
    status: String, //Cleared, Bounced
    user: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    date: Date,
  },

  remarks: String,
  items: [Object],
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

  delivery_items: [
    {
      _id: mongoose.Schema.Types.ObjectId,

      external_si_reference: String,
      reference: String,
      branch_reference: String,
      dr_no: Number,
      date: Date,
      due_date: Date,
      account: {
        ...AccountModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
      adjustment_amount: Number,
      total_amount: Number,
      payment_amount: Number,
      balance: Number,
    },
  ],
  credit_memo_items: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      cm_no: Number,
      date: Date,
      account: {
        ...AccountModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
      branch_reference: String,
      sales_return: {
        return_no: Number,
        _id: mongoose.Schema.Types.ObjectId,
        date: Date,
        branch_reference: String,
      },
      total_amount: Number,
      credit_amount: Number,
      balance: Number,
    },
  ],

  additional_rate: Number,
  additional_rate_amount: Number,
  additional_value: Number,
  additional_rate_remarks: String,
  additional_value_remarks: String,

  deduct_rate: Number,
  deduct_rate_amount: Number,
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
  total_credit_amount: Number,

  opening_balance: Number,
  opening_balance_payment: Number,
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("customer_collections", TableSchema);
