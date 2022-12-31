const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BranchInventorySchema = new Schema({
  date: Date,
  product: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    category: {
      type: Object
    }
  },
  beg_bal: Number,
  product_ins: Number,
  orders: Number,
  sales: Number,
  end_bal: Number,
  computed_bal: Number,
  variance: Number,
  log: {
    user: Object,
    datetime: Date,
    log: String
  }
});

module.exports = mongoose.model("branch_inventories", BranchInventorySchema);
