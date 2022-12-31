const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const SupplierModel = require("./SupplierModel");
const Schema = mongoose.Schema;

delete SupplierModel._id;

const SupplierSchema = new Schema({
  ...SupplierModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

SupplierSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("suppliers", SupplierSchema);
