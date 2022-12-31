const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const MenuRouteSchema = new Schema({
  name: String,
  route: String,
  parent_menu: String,
  sequence: Number,
});
MenuRouteSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("menu_routes", MenuRouteSchema);
