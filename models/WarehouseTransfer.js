const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const EmployeeModel = require("./EmployeeModel");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const TankerModel = require("./TankerModel");
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    wt_no: Number,
    date: Date,
    tanker: {
      ...TankerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    driver: {
      ...EmployeeModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    to_warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    items: [
      {
        stock: {
          _id: mongoose.Schema.Types.ObjectId,
          ...ProductModel,
        },
        unit_of_measure: {
          ...UnitOfMeasureSchema,
          _id: mongoose.Schema.Types.ObjectId,
        },
        quantity: Number,
      },
    ],
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

    printed: {
      user: Object,
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

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("warehouse_transfers", TableSchema);
