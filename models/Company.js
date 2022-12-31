const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const CompanyModel = require("./CompanyModel");

delete CompanyModel._id;

const ModelSchema = new Schema({
  ...CompanyModel,

  logo: Object,
});
ModelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("companies", ModelSchema);
