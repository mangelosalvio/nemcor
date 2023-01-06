const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;
const EmployeeModel = require("./EmployeeModel");
const UserSchema = require("./UserSchema");

delete EmployeeModel._id;

const EmployeeSchema = new Schema({
  ...EmployeeModel,
  status: {
    approval_status: String,
    datetime: Date,
    user: UserSchema,
  },
  deleted: {
    date: Date,
    user: Object,
  },
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

EmployeeSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("employees", EmployeeSchema);
