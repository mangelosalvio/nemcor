const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeletedOrderSchema = new Schema({
  item: Object,
  table_name: String,
  order_id: Number,
  datetime: Date,
  deleted: {
    user: Object,
    datetime: Date,
    authorized_by: Object
  }
});

module.exports = mongoose.model("deleted_orders", DeletedOrderSchema);
