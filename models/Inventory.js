const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
  product: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    category: Object
  },
  balance: Number
});

module.exports = mongoose.model("inventories", InventorySchema);
