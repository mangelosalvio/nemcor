const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const EmployeeModel = require("./EmployeeModel");

const Schema = mongoose.Schema;

const PayrollAdjustmentSchema = new Schema(
  {
    date: Date,
    payroll_adj_no: Number,

    items: [
      {
        employee: {
          ...EmployeeModel,
          _id: mongoose.Schema.Types.ObjectId,
        },

        particulars: String,
        amount: Number,
      },
    ],
    created_at: Date,
    updated_at: Date,

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
    status: {
      approval_status: String,
      datetime: Date,
      user: Object,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

PayrollAdjustmentSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("payroll_adjustments", PayrollAdjustmentSchema);
