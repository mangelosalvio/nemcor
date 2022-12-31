const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuditTrailSchema = new Schema({
  date: Date,
  user: Object,
  activity: String,
  reference: Number,
  trans_id: Number,
  amount: Number,
  old_value: Number,
  new_value: Number,
  remarks: String,
  deleted: {
    user: Object,
    datetime: Date,
    reason: String,
  },
});

module.exports = mongoose.model("audit_trails", AuditTrailSchema);
