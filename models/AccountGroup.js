const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const AccountGroupModel = require("./AccountGroupModel");

delete AccountGroupModel._id;

const ModelSchema = new Schema({
  ...AccountGroupModel,

  deleted: {
    date: Date,
    user: Object,
  },
});

ModelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("account_groups", ModelSchema);
