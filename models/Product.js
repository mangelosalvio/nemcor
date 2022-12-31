const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");

delete ProductModel._id;
const ProductSchema = new Schema(ProductModel);

ProductSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("products", ProductSchema);
