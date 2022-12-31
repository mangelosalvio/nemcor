const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WaiterSchema = new Schema({
  name: String,
  password: String,
});

module.exports = mongoose.model("waiters", WaiterSchema);
