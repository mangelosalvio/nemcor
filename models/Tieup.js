const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TieupSchema = new Schema({
  name: String,
  markup_option: String,
  markup: Number,
});

module.exports = mongoose.model("tieups", TieupSchema);
