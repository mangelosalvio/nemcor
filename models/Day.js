const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const DaySchema = new Schema({
  date: Date,
  is_special_holiday: Boolean,
  is_regular_holiday: Boolean,
  has_no_operations: Boolean,
});

DaySchema.plugin(mongoose_paginate);
module.exports = mongoose.model("day", DaySchema);
