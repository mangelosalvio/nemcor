const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SalesReturnsOtherSetSchema = new Schema({
  sales_id: Number,
  trans_id: Number,
  datetime: {
    type: Date,
    required: true,
  },
  customer: Object,
  is_senior: Boolean,
  summary: {
    type: Object,
  },
  payments: Object,
  items: [Object],

  user: Object,

  deleted: {
    user: Object,
    datetime: Date,
    reason: String,
    old_trans_id: Number,
  },
});

module.exports = mongoose.model(
  "sales_returns_other_set",
  SalesReturnsOtherSetSchema
);
