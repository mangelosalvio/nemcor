const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const XreadSchema = new Schema({
  trans_id: Number,
  xread_id: Number,
  user: {
    _id: Schema.Types.ObjectId,
    name: String,
    username: String,
  },
  transaction_date: Date,
  from_datetime: Date,
  to_datetime: Date,
  date_printed: Date,
  gross_amount: Number,
  total_returns: Number,
  net_of_returns: Number,
  less_vat: Number,
  less_sc_disc: Number,
  less_disc: Number,
  voided_sales: Number,

  net_of_void: {
    gross_amount: Number,
    total_returns: Number,
    net_of_returns: Number,
    less_vat: Number,
    less_sc_disc: Number,
    less_disc: Number,
    net_amount: Number,
  },

  net_amount: Number,
  vat_sales: Number,
  vat_exempt: Number,
  vat_amount: Number,
  non_vat_amount: Number,
  from_sales_id: Number,
  to_sales_id: Number,
  number_of_voided_invoices: Number,
  deleted: {
    user: Object,
    datetime: Date,
    reason: String,
  },
  credit_card_transactions: [
    {
      sales_id: Number,
      datetime: Date,
      credit_card: Object,
    },
  ],
  credit_card_summary: [
    {
      card: String,
      amount: Number,
    },
  ],
  credit_card_summary_per_bank: [
    {
      bank: String,
      amount: Number,
    },
  ],
  check_transactions: [Object],
  free_of_charge_transactions: [Object],
  online_payment_transactions: [Object],
  gift_check_transactions: [Object],
  charge_to_account_transactions: [Object],
  check_sales: Number,
  free_of_charge_sales: Number,
  online_payment_sales: Number,
  gift_check_sales: Number,
  charge_to_account_sales: Number,
  credit_card_sales: Number,
  cash_sales: Number,
  account_collection_summary: {
    cash: Number,
    credit_card_total: Number,
    online_payments_total: Number,
    checks_total: Number,
    deposit_total: Number,
  },

  cash_count: Object,
  cash_variance: Number,
});

module.exports = mongoose.model("xreads", XreadSchema);
