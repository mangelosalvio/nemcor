const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BranchCounterSchema = new Schema({
  counter_key: String,
  branch_id: mongoose.Schema.Types.ObjectId,
  next: {
    type: Number,
    default: 1,
  },
});

BranchCounterSchema.statics.increment = function (counter, branch, callback) {
  return this.findOneAndUpdate(
    {
      counter_key: counter,
      branch_id: mongoose.Types.ObjectId(branch._id),
    },
    { $inc: { next: 1 } },
    { new: true, upsert: true, select: { next: 1 } },
    callback
  );
};

module.exports = mongoose.model("branch_counters", BranchCounterSchema);
