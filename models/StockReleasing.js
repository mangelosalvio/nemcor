const mongoose = require("mongoose");
const mongoose_paginate = require("mongoose-paginate");
const Schema = mongoose.Schema;

const TableSchema = new Schema({
  stock_releasing_no: Number,
  date: Date,
  warehouse: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
  },
  customer: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
    owner: String,
    contact_no: String,
    terms: String,
  },
  remarks: String,
  stocks_receiving: Object,
  stock_transfer: Object,
  items: [
    {
      stock: {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        category: {
          _id: mongoose.Schema.Types.ObjectId,
          name: String,
        },
        meat_types: [String],
        sku: String,

        case_uom: String,
        uom: String,
        pieces_in_case: Number,

        description: String,

        taxable: Boolean,
        type_of_senior_discount: String,

        add_ons: [
          {
            product: Object,
          },
        ],

        tieup_prices: [
          {
            tieup: {
              _id: mongoose.Schema.Types.ObjectId,
              name: String,
            },
            price: Number,
          },
        ],

        reorder_level_case: Number,
        reorder_quantity_case: Number,

        inventory_cost: Number,
        inventory_quantity: Number,

        disabled: Boolean,
      },

      case_quantity: Number,
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
  total_amount: Number,
  sale: Object,
  printed: {
    user: Object,
    datetime: Date,
  },
  reconciled: Boolean,
});

TableSchema.plugin(mongoose_paginate);
module.exports = mongoose.model("stock_releasing", TableSchema);
