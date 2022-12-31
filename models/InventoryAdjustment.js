const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const ItemsSchema = require("./ItemsSchema");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const InventoryAdjustmentSchema = new Schema({
  adj_no: Number,
  date: Date,
  department: {
    ...NameModel,
    _id: mongoose.Schema.Types.ObjectId,
  },
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    ...WarehouseModel,
  },
  remarks: String,

  items: ItemsSchema,
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
  total_amount: Number,
  total_discount_amount: Number,
  gross_amount: Number,

  printed: {
    user: Object,
    datetime: Date,
  },
});

InventoryAdjustmentSchema.plugin(mongoose_paginate);
module.exports = mongoose.model(
  "inventory_adjustments",
  InventoryAdjustmentSchema
);
