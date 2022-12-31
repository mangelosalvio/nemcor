const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;
const EmployeeModel = require("./EmployeeModel");

delete EmployeeModel._id;

const EmployeeSchema = new Schema({
  ...EmployeeModel,
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
