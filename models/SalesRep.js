const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    name: String,

    deleted: {
      date: Date,
      user: Object,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("sales_reps", TableSchema);
