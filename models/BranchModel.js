const mongoose = require("mongoose");
const CompanyModel = require("./CompanyModel");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  company: {
    ...CompanyModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  branch_code: String,
  address: String,
  contact_no: String,

  payroll_checked_by: String,
  payroll_approved_by: String,
};
