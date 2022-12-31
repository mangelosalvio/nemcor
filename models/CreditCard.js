const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CreditCardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String
    }
  ]
});

module.exports = mongoose.model("credit_cards", CreditCardSchema);
