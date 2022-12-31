const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");

const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  name: String,
});
ModelSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("roles", ModelSchema);
