const mongoose = require("mongoose");
const SellerModel = require("./SellerModel");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const SalesSchema = new Schema({
  sales_id: Number,
  trans_id: Number,
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    ...WarehouseModel,
  },
  datetime: {
    type: Date,
    required: true,
  },
  customer: Object,
  is_senior: Boolean,
  summary: {
    type: Object,
  },
  payments: {
    gift_checks: [Object],
    charge_to_accounts: [
      {
        account: {
          _id: mongoose.Schema.Types.ObjectId,
          name: String,
          company_name: String,
        },
        amount: Number,
        balance: Number,
        user: Object,
        authorized_by: Object,
      },
    ],
    checks: [Object],
    credit_cards: [Object],
    free_of_charge_payments: [Object],
    online_payments: [Object],
    credit_card_total: Number,
    checks_total: Number,
    online_payments_total: Number,
    free_of_charge_payments_total: Number,
    charge_to_accounts_total: Number,
    gift_checks_total: Number,
    cash: Number,
  },
  items: [Object],

  user: Object,

  deleted: {
    user: Object,
    authorized_by: Object,
    datetime: Date,
    reason: String,
    old_trans_id: Number,
  },
  table: Object,
  tieup_information: {
    tieup: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    booking_reference: String,
  },
  sales_order_id: mongoose.Schema.Types.ObjectId,
  seller: {
    _id: mongoose.Schema.Types.ObjectId,
    ...SellerModel,
  },
});

module.exports = mongoose.model("sales", SalesSchema);
