const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const BranchModel = require("./BranchModel");
const UserSchema = require("./UserSchema");

const ModelSchema = new Schema({
  ...UserSchema,
  password: String,
  role: String,
  branches: [
    {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
  ],
  expires_at: Date,
  permissions: [
    {
      name: String,
      route: String,
      access: [String],
    },
  ],
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
});

ModelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("users", ModelSchema);
