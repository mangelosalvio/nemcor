const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GiftCheckSchema = new Schema({
  date: Date,
  items: [
    {
      gift_check_number: String,
      amount: Number,
      used: {
        table: Object,
        datetime: Date,
      },
      sold: {
        sale: Object,
      },
      remarks: String,
    },
  ],
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

module.exports = mongoose.model("gift_checks", GiftCheckSchema);
