const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const EmployeeModel = require("./EmployeeModel");
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  period_covered: [Date],
  employee: {
    ...EmployeeModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  days: [
    {
      date: Date,
      status: String, //PRESENT, ABSENT, LATE, UNDERTIME, NO TIME-IN
      hours: Number, //inclusive of night differential hours
      night_diff_hours: Number,
      night_diff_ot_hours: Number,
      leave_availed: Boolean,
    },
  ],
});

AttendanceSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("attendance", AttendanceSchema);
