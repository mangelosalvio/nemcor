const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

delete WarehouseModel._id;

const TableSchema = new Schema({
  ...WarehouseModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});
TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("warehouses", TableSchema);
