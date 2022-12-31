const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MeatTypeSchema = new Schema({
  name: String,
});

module.exports = mongoose.model("meat_types", MeatTypeSchema);
