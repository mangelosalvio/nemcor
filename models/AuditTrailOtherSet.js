const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuditTrailOtherSet = new Schema({
  date: Date,
  user: Object,
  activity: String,
  reference: Number,
  trans_id: Number,
  amount: Number,
  old_value: Number,
  new_value: Number,
  remarks: String,
});

module.exports = mongoose.model("audit_trail_other_set", AuditTrailOtherSet);
