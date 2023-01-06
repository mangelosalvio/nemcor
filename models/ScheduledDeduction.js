const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const EmployeeModel = require("./EmployeeModel");
const UserSchema = require("./UserSchema");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  doc_no: Number,
  date: Date,
  deduction: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
  },
  employee: {
    ...EmployeeModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  start_date: Date,
  total_amount: Number,
  no_of_pay_days: Number,
  deduction_amount: Number, //deduction every pay day

  payroll_deductions: [
    {
      period_covered: [Date],
      amount: Number,
    },
  ],

  remarks: String,

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
    user: UserSchema,
  },
  // status: String, //PAID
});
TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("scheduled_deductions", TransactionSchema);
