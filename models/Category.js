const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const CategoryModel = require("./CategoryModel");

delete CategoryModel._id;

const CategorySchema = new Schema({
  ...CategoryModel,
});
CategorySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("categories", CategorySchema);
