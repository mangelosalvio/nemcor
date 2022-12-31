const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AccountPayments = new Schema({
  name: String,
  company_name: String,
  ledger: [
    {
      date: Date,
      particulars: String,
      debit: Number,
      credit: Number,
      kind: String,
      item: {
        type: Schema.Types.ObjectId,
        refPath: "ledger.kind"
      }
    }
  ]
});

module.exports = mongoose.model("accounts", AccountPayments);
