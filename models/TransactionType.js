const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  type: String,
  name: String,
  lr: Number,

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

ModelSchema.plugin(require("mongoose-paginate"));
module.exports = mongoose.model("transaction_types", ModelSchema);
