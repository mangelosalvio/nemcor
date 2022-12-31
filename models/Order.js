const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    order_id: Number,
    items: [Object],
    user: Object,
    datetime: Date,

    created_at: Date,
    updated_at: Date,
    table: Object,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("orders", TableSchema);
