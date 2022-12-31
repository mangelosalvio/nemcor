const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate");

const StationSchema = new Schema({
  name: String,
  ip_address: String,
  printer: Object,
});
StationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("stations", StationSchema);
