const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const SellerModel = require("./SellerModel");
const Schema = mongoose.Schema;

delete SellerModel._id;

const TableSchema = new Schema({
  ...SellerModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("sellers", TableSchema);
