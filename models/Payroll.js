const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const BranchModel = require("./BranchModel");
const EmployeeModel = require("./EmployeeModel");
const Schema = mongoose.Schema;

const PayrollSchema = new Schema({
  cv_no: Number,
  branch_reference: String,

  period_covered: [Date],
  employee: {
    ...EmployeeModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  daily_rate: Number,
  hourly_rate: Number,
  ot_rate: Number,
  special_ot_rate: Number,
  rest_day_rate: Number,
  special_holiday_rate: Number,
  regular_holiday_rate: Number,

  // special_rest_day_rate: Number,
  // regular_rest_day_rate: Number,
  // daily_non_taxable_allowance: Number,
  // daily_meal_allowance: Number,

  reg_days: Number,
  reg_hours: Number,

  ot_hours: Number, //25%
  special_ot_hours: Number, //30%
  rest_day_hours: Number, //30%
  special_holiday_hours: Number, //30%
  regular_holiday_hours: Number, //100%
  special_rest_day_hours: Number, //50%
  regular_rest_day_hours: Number, //160%

  // night_diff_hours: Number, //110%
  // night_diff_ot_hours: Number, //137.5%

  // none_taxable_allowance: Number,
  // meal_allowance: Number,

  sss_contribution: Number,
  philhealth_contribution: Number,
  hdmf_contribution: Number,
  wtax: Number,

  // payroll_adjustments: [Object],
  // total_adjustment_amount: Number,

  basic_pay: Number,
  ot_pay: Number,
  special_ot_pay: Number,
  total_ot_amount: Number,
  rest_day_pay: Number,
  special_holiday_pay: Number,
  regular_holiday_pay: Number,
  // special_rest_day_pay: Number,
  // regular_rest_day_pay: Number,

  // night_diff_pay: Number,
  // night_diff_ot_pay: Number,

  total_premium_amount: Number,
  total_premium_deductions: Number,

  total_gross_salary: Number,
  total_deduction: Number,
  net_salary_pay: Number,

  deductions: [
    {
      deduction: String,
      amount: Number,
      scheduled_deduction_id: mongoose.Schema.Types.ObjectId,
    },
  ],

  other_deductions: Number,

  // incentive: Object,
  days: [Object],
  // incentive_days: [Object],
  remarks: String,
});

PayrollSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("payroll", PayrollSchema);
