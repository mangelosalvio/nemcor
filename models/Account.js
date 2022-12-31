const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const AccountModel = require("./AccountModel");

delete AccountModel._id;
const AccountSchema = new Schema({
  ...AccountModel,
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String,
    },
  ],
  deleted: {
    date: Date,
    user: Object,
  },
});

AccountSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("accounts", AccountSchema);
