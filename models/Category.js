const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const CategoryModel = require("./CategoryModel");
const UserLogSchema = require("./UserLogSchema");

delete CategoryModel._id;

const CategorySchema = new Schema(
  {
    ...CategoryModel,
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
CategorySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("categories", CategorySchema);
