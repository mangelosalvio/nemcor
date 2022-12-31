const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TableSchema = new Schema({
  is_other_set: Boolean,
  is_temporary_table: Boolean,
  name: {
    type: String,
    required: true,
  },
  orders: [
    {
      order_id: Number,
      items: [Object],
      user: Object,
      datetime: Date,
    },
  ],
  payments: {
    credit_cards: [
      {
        credit_card: {
          name: String,
          card: String,
          card_number: String,
          reference_number: String,
          approval_code: String,
          amount: Number,
          bank: String,
        },
      },
    ],
    checks: [
      {
        bank: String,
        name: String,
        check_no: String,
        check_date: Date,
        amount: Number,
      },
    ],
    online_payments: [
      {
        depository: String,
        reference: String,
        amount: Number,
      },
    ],
    free_of_charge_payments: [
      {
        name: String,
        remarks: String,
        amount: Number,
        user: Object,
        authorized_by: Object,
      },
    ],
    charge_to_accounts: [
      {
        account: {
          _id: mongoose.Schema.Types.ObjectId,
          name: String,
          company_name: String,
        },
        amount: Number,
        user: Object,
        authorized_by: Object,
      },
    ],
    gift_checks: [
      {
        gift_check: Object,
        amount: Number,
      },
    ],
    cash: Number,
  },
  summary: {
    type: Object,
  },
  customer: {
    name: String,
    address: String,
    tin: String,
    business_style: String,
    contact_no: String,
    time: String,
  },
  tieup_information: {
    tieup: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    booking_reference: String,
  },
});

module.exports = mongoose.model("tables", TableSchema);
