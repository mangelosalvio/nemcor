const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const CustomerModel = require("./CustomerModel");
const EmployeeModel = require("./EmployeeModel");
const ItemsSchema = require("./ItemsSchema");
const LocationModel = require("./LocationModel");
const NameModel = require("./NameModel");
const ProductModel = require("./ProductModel");
const SupplierModel = require("./SupplierModel");
const TankerModel = require("./TankerModel");
const UnitModel = require("./UnitModel");
const UnitOfMeasureSchema = require("./UnitOfMeasureSchema");
const UserSchema = require("./UserSchema");
const WarehouseModel = require("./WarehouseModel");
const Schema = mongoose.Schema;

const TableSchema = new Schema(
  {
    tw_no: Number,
    date: Date,
    department: {
      ...NameModel,
      _id: mongoose.Schema.Types.ObjectId,
    },
    tanker: {
      ...TankerModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    driver: {
      ...EmployeeModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    source_withdrawal: String,

    //tankers withdrawn from
    source_tankers: [
      {
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

    //if Depot is selected
    warehouse: {
      ...WarehouseModel,
      _id: mongoose.Schema.Types.ObjectId,
    },

    source_depot_items: [
      {
        warehouse: {
          ...WarehouseModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        stock: {
          ...ProductModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        quantity: Number,
        unit_of_measure: {
          ...UnitOfMeasureSchema,
          _id: mongoose.Schema.Types.ObjectId,
        },
      },
    ],

    total_amount: Number,
    items: [
      {
        company: {
          ...NameModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        so_id: mongoose.Schema.Types.ObjectId,
        so_no: Number,
        so_item_id: mongoose.Schema.Types.ObjectId,
        so_delivery_area: {
          ...LocationModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        customer: {
          ...CustomerModel,
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
        price: Number,
        amount: Number,
        unit: {
          ...UnitModel,
          _id: mongoose.Schema.Types.ObjectId,
        },
        external_dr_ref: String,
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

    is_per_unit_dr: Number,
    remarks: String,
    validated: {
      datetime: Date,
      user: {
        id: mongoose.Schema.Types.ObjectId,
        name: String,
      },
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
module.exports = mongoose.model("tanker_withdrawals", TableSchema);
