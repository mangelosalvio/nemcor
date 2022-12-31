const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const EmployeeModel = require("./EmployeeModel");
const Schema = mongoose.Schema;

const DailyTimeRecordSchema = new Schema({
  date: Date,
  is_sunday: Boolean,
  is_special_holiday: Boolean,
  is_regular_holiday: Boolean,

  employee: {
    ...EmployeeModel,
    _id: mongoose.Schema.Types.ObjectId,
  },

  //formula
  /**
   * is absent  - no pay
   * 8 - undertime
   *
   *
   */

  is_absent: Boolean,
  leave_availed: Boolean, //with pay if availed
  undertime_hours: Number,
  ot_hours: Number,
});

DailyTimeRecordSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("daily_time_records", DailyTimeRecordSchema);
