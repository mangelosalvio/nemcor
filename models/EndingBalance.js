const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EndingBalanceSchema = new Schema({
  date: Date,
  ending_balance_id: Number,
  raw_materials: [
    {
      raw_material: Object,
      raw_material_quantity: Number
    }
  ],
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String
    }
  ],
  deleted: {
    date: Date,
    user: Object,
    log: String
  }
});

module.exports = mongoose.model("ending_balances", EndingBalanceSchema);
