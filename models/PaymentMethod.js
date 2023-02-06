const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");
const PaymentMethodModel = require("./PaymentMethodModel");

delete PaymentMethodModel._id;

const ModelSchema = new Schema({
  ...PaymentMethodModel,

  logo: Object,
});
ModelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("payment_methods", ModelSchema);
