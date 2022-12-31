const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");

const ItemsSchema = require("./ItemsSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    date: Date,
    pc_no: Number,
    warehouse: {
      _id: mongoose.Schema.Types.ObjectId,
      ...WarehouseModel,
    },
    remarks: String,
    items: [
      {
        ...ItemsSchema[0],
        inventory_quantity: Number,
        adjustment_quantity: Number,
      },
    ],

    created_at: Date,
    updated_at: Date,

    logs: [
      {
        user: Object,
        datetime: Date,
        log: String,
      },
    ],
    deleted: {
      date: Date,
      user: Object,
    },
    status: {
      approval_status: String,
      datetime: Date,
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

TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("physical_counts", TransactionSchema);
