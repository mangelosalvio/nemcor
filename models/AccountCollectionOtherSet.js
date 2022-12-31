const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AccountCollectionOtherSet = new Schema({
  account_collection_no: Number,
  datetime: Date,
  account: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    company_name: String,
  },
  customer: Object,
  summary: Object,
  payments: {
    gift_checks: [Object],
    checks: [Object],
    credit_cards: [Object],
    free_of_charge_payments: [Object],
    online_payments: [Object],
    credit_card_total: Number,
    check_total: Number,
    online_payments_total: Number,
    free_of_charge_payments_total: Number,
    charge_to_accounts_total: Number,
    gift_checks_total: Number,
    cash: Number,
  },
  items: [
    {
      sales: Object,
      charge_to_account: {
        _id: mongoose.Schema.Types.ObjectId,
        amount: Number,
      },
      payment_amount: Number,
    },
  ],
  user: Object,
  deleted: {
    user: Object,
    authorized_by: Object,
    datetime: Date,
    reason: String,
  },
});

module.exports = mongoose.model(
  "account_collections_other_set",
  AccountCollectionOtherSet
);
