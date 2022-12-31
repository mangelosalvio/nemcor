const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ModelSchema = new Schema({
  claim_type_id: Number,
  name: String,

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
module.exports = mongoose.model("claim_types", ModelSchema);
