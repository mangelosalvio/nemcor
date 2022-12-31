const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const NameModel = require("./NameModel");

delete NameModel._id;

const AccountSchema = new Schema({
  ...NameModel,

  deleted: {
    date: Date,
    user: Object,
  },
});

AccountSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("account_statuses", AccountSchema);
