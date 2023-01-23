const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BranchTransactionCounter = new Schema({
  counter_key: String,
  branch_id: mongoose.Schema.Types.ObjectId,
  transaction: String,
  next: {
    type: Number,
    default: 1,
  },
});

BranchTransactionCounter.statics.increment = function (
  counter,
  branch_id,
  transaction,
  callback
) {
  return this.findOneAndUpdate(
    {
      counter_key: counter,
      branch_id: mongoose.Types.ObjectId(branch_id),
      transaction,
    },
    { $inc: { next: 1 } },
    { new: true, upsert: true, select: { next: 1 } },
    callback
  );
};

module.exports = mongoose.model(
  "branch_transaction_counters",
  BranchTransactionCounter
);
