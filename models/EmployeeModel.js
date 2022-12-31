const mongoose = require("mongoose");
const BranchModel = require("./BranchModel");
const CompanyModel = require("./CompanyModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  branch: {
    ...BranchModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  employee_id: String,
  name: String,
  date_of_birth: Date,
  address: String,
  contact_no: String,
  sss_no: String,
  tin: String,
  philhealth_no: String,
  hdmf_no: String,
  date_hired: Date,
  date_released: Date,

  daily_rate: Number,
  weekly_sss_contribution: Number,
  weekly_philhealth_contribution: Number,
  weekly_hdmf_contribution: Number,
  weekly_wtax: Number,
};
