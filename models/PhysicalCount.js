const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const BranchModel = require("./BranchModel");

const ItemsSchema = require("./ItemsSchema");
const ProductModel = require("./ProductModel");
const UserLogSchema = require("./UserLogSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    date: Date,
    pc_no: Number,
    application_date: Date,
    branch_reference: String,
    branch: {
      ...BranchModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    remarks: String,
    items: [
      {
        stock: {
          _id: mongoose.Schema.Types.ObjectId,
          ...ProductModel,
        },
        case_quantity: Number,
        quantity: Number,
        case_price: Number,
        price: Number,
        amount: Number,

        running_balance: Number,
        adjustment_quantity: Number,
      },
    ],

    created_at: Date,
    updated_at: Date,

    logs: [
      {
        user: UserLogSchema,
        datetime: Date,
        log: String,
      },
    ],
    deleted: {
      date: Date,
      user: UserLogSchema,
    },
    status: {
      approval_status: String,
      datetime: Date,
      user: UserLogSchema,
    },
    total_amount: Number,
    total_discount_amount: Number,
    gross_amount: Number,

    printed: {
      user: UserLogSchema,
      datetime: Date,
    },

    created_at: Date,
    updated_at: Date,
    created_by: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    updated_by: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

TransactionSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("physical_counts", TransactionSchema);
