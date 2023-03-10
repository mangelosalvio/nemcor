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
    replacement_no: Number,
    date: Date,
    due_date: Date,
    branch_reference: String,
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    account: {
      ...AccountModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    invoice_date: Date,
    reference: String,
    po_notes: String,
    external_si_reference: String,
    remarks: String,
    payment_type: String,
    cash_payment_amount: Number,
    change: Number,

    total_payment_amount: Number,

    items: [
      {
        stock: {
          _id: mongoose.Schema.Types.ObjectId,
          ...ProductModel,
        },
        quantity: Number,
        price: Number,
        amount: Number,
        is_damaged: Boolean, //if checked, do not add to inventory
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

    //if from display delivery receipt
    display_delivery_receipt: {
      _id: mongoose.Schema.Types.ObjectId,
      date: Date,
      branch_reference: String,
      reference: String,
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
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("replacement_receipts", TableSchema);