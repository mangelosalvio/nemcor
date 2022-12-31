const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
  _id: String,
  company_id: mongoose.Schema.Types.ObjectId,
  next: {
    type: Number,
    default: 1,
  },
});

const ObjectId = mongoose.Types.ObjectId;
CounterSchema.statics.increment = function (counter, company_id, callback) {
  return this.findOneAndUpdate(
    {
      _id: counter,
      company_id: ObjectId(company_id),
    },
    { $inc: { next: 1 } },
    { new: true, upsert: true, select: { next: 1 } },
    callback
  );
};

module.exports = mongoose.model("company_counters", CounterSchema);
