const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");
const BranchModel = require("./BranchModel");
const StaffModel = require("./StaffModel");

const Schema = mongoose.Schema;

const TableSchema = new Schema({
  pension_id: Number,
  account: {
    ...AccountModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  date_request: Date,
  branch: {
    ...BranchModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  claim_type: {
    claim_type_id: Number,
    name: String,
    _id: mongoose.Schema.Types.ObjectId,
  },
  date_release: Date,
  datetime: Date,
  mo_pension: Number,
  pawned: Number,
  term: String,
  original_prin: Number,
  additional_prin: Number,
  pawned_orig: Number,
  pawned_add: Number,
  term_orig: Number,
  term_add: Number,
  old_balance: Number,
  old_unearned: Number,
  old_release: Number,
  fee_legal: Number,
  fee_ci: Number,
  fee_sc: Number,
  fee_cf: Number,
  tdeduction: Number,
  netcash: Number,
  branch_manager: {
    ...StaffModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  date_start: Date,
  dat_sadd: Date,
  intrate_orig: Number,
  intrate_add: Number,
  interest_orig: Number,
  interest_add: Number,
  loan_type: {
    _id: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
    },
    lr: Number,
    name: String,
  },
  loan_sub: String,
  interest_adv: Number,
  status: String,
  pension: String,
  additional: Number,
  memo: String,
  totalpension: Number,
  pawned_orig2: Number,
  term_orig2: Number,
  date_end1: Date,
  date_start2: Date,
  date_end2: Date,
  date_eadd: Date,
  intrate_adv: Number,
  scname: String,
  sc_commission: Number,

  slmark: Number,
  oldacc: Number,

  gawad: Number,
  relamount: Number,
  capayment: Number,
  bonuspay: Number,
  changepay: Number,
  bal_fward: Number,
  date_approved: Date,
  excesscr: Number,
  slupdate: Date,
  promo: Number,

  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("pensions", TableSchema);
