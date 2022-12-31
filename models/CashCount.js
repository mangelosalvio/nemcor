const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CashCountSchema = new Schema({
  cash_count_id: Number,
  date: Date,
  items: [
    {
      denomination: Number,
      quantity: Number,
      amount: Number,
    },
  ],
  total_amount: Number,
  user: {
    _id: Schema.Types.ObjectId,
    name: String,
    username: String,
  },

  deleted: {
    user: Object,
    datetime: Date,
    reason: String,
  },
});

module.exports = mongoose.model("cash_counts", CashCountSchema);
