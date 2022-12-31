const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const CustomerModel = require("./CustomerModel");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const TankerModel = require("./TankerModel");
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    wr_no: Number,
    date: Date,

    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    source: String, //Supplier Withdrawal or Tanker Withdrawal

    tanker: {
      ...TankerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    //either from supplier withdrawal or from tanker withdrawal
    supplier_withdrawal: {
      _id: mongoose.Schema.Types.ObjectId,
      ww_no: Number,
      supplier: {
        ...SupplierModel,
        _id: mongoose.Schema.Types.ObjectId,
      },
    },

    tanker_withdrawal: {
      _id: mongoose.Schema.Types.ObjectId,
      tw_no: Number,
    },

    items: [
      {
        tw_no: Number,
        tanker_withdrawal_id: mongoose.Schema.Types.ObjectId,

        supplier_withdrawal_id: mongoose.Schema.Types.ObjectId,
        supplier_withdrawal_item_id: mongoose.Schema.Types.ObjectId,
        ww_no: Number,
        supplier: {
          ...SupplierModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        tanker: {
          ...TankerModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        stock: {
          ...ProductModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        unit_of_measure: {
          ...UnitOfMeasureSchema,
          _id: mongoose.Schema.Types.ObjectId,
        },
        quantity: Number,
      },
    ],

    deleted: {
      user: Object,
      datetime: Date,
    },
    logs: [
      {
        user: Object,
        datetime: Date,
        log: String,
      },
    ],

    status: {
      approval_status: String,
      datetime: Date,
      user: Object,
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
module.exports = mongoose.model("warehouse_returns", TableSchema);
