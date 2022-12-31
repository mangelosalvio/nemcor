const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AccountSettingSchema = new Schema({
  key: String,
  label: String,
  value: Object,
  input: String
});

module.exports = mongoose.model("account_settings", AccountSettingSchema);
