const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
  _id: String,
  next: {
    type: Number,
    default: 1
  }
});

CounterSchema.statics.increment = function(counter, callback) {
  return this.findByIdAndUpdate(
    counter,
    { $inc: { next: 1 } },
    { new: true, upsert: true, select: { next: 1 } },
    callback
  );
};

module.exports = mongoose.model("counters", CounterSchema);
