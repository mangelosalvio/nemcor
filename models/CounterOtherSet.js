const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CounterOtherSetSchema = new Schema({
  _id: String,
  next: {
    type: Number,
    default: 1,
  },
});

CounterOtherSetSchema.statics.increment = function (counter, callback) {
  return this.findByIdAndUpdate(
    counter,
    { $inc: { next: 1 } },
    { new: true, upsert: true, select: { next: 1 } },
    callback
  );
};

module.exports = mongoose.model("counter_other_set", CounterOtherSetSchema);
