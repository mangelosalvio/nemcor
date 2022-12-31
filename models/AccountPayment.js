const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AccountPaymentSchema = new Schema({
  account_payment_id: Number,
  date: Date,
  account: Object,
  particulars: String,
  payment_type: String,
  credit_card: {
    name: String,
    card: String,
    card_number: String,
    reference_number: String,
    approval_code: String
  },
  amount: Number,
  deleted: {
    user: Object,
    datetime: Date,
    reason: String
  }
});

module.exports = mongoose.model("account_payments", AccountPaymentSchema);
