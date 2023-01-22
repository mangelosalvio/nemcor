const mongoose = require("mongoose");
const UserLogSchema = require("./UserLogSchema");
const UserSchema = require("./UserSchema");
const Schema = mongoose.Schema;
const user_schema = UserSchema;

const TransactionAuditTrailSchema = new Schema({
  date: Date,
  user: UserLogSchema,
  module_name: String,
  reference: String,
  description: String,
  action: String,
});

module.exports = mongoose.model(
  "transaction_audit_trails",
  TransactionAuditTrailSchema
);
