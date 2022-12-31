const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const NameModel = require("./NameModel");

delete NameModel._id;

const ModelSchema = new Schema({
  ...NameModel,
});
ModelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("departments", ModelSchema);
