const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  date: Date,
  raw_in_id: Number,
  raw_materials: [
    {
      raw_material: Object,
      raw_material_quantity: Number
    }
  ],
  logs: [
    {
      user: Object,
      datetime: Date,
      log: String
    }
  ],
  deleted: {
    date: Date,
    user: Object,
    log: String
  }
});

module.exports = mongoose.model("raw_ins", ModelSchema);
