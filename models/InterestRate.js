const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  table_interest_id: Number,
  month: Number,
  int_new: Number,
  int_add: Number,
  int_renew: Number,
  fee_legal: Number,
  fee_ci: Number,
  fee_service: Number,
  fee_collect: Number,
  int_collect: Number,
  type: String,
  detail: String,
  insure: Number,
});

module.exports = mongoose.model("interest_rates", ModelSchema);
