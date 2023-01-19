const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const ProductModel = require("./ProductModel");
const UserLogSchema = require("./UserLogSchema");

delete ProductModel._id;
const ProductSchema = new Schema(
  {
    ...ProductModel,

    deleted: {
      date: Date,
      user: UserLogSchema,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

ProductSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("products", ProductSchema);
