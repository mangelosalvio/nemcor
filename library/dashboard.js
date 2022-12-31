const mongoose = require("mongoose");
const moment = require("moment");
const PurchaseOrder = require("./../models/PurchaseOrder");
const Sales = require("./../models/Sales");

const Warehouse = require("./../models/Warehouse");
const constants = require("../config/constants");

const isEmpty = require("../validators/is-empty");

/**
 * REASSIGN ITEMS
 */
const ObjectId = mongoose.Types.ObjectId;
module.exports.getPendingPurchaseOrders = (cb) => {
  PurchaseOrder.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        po_status: {
          $nin: [constants.PO_STATUS_ACCOMPLISHED, constants.PO_STATUS_CLOSED],
        },
      },
    },
    {
      $unwind: "$items",
    },
    {
      $sort: {
        date: 1,
      },
    },
  ]).exec(cb);
};

module.exports.getWarehouseSales = (cb) => {
  const last_month = moment().subtract({ days: 30 }).startOf("day").toDate();
  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        total_amount: {
          $gt: 0,
        },
        date: {
          $gte: last_month,
        },
      },
    },
    {
      $addFields: {
        cash_sales: {
          $cond: [
            {
              $eq: ["$payment_type", "Cash"],
            },
            "$total_amount",
            0,
          ],
        },
        charge_sales: {
          $cond: [
            {
              $eq: ["$payment_type", "Charge"],
            },
            "$total_amount",
            0,
          ],
        },
        check_sales: {
          $cond: [
            {
              $eq: ["$payment_type", "Check"],
            },
            "$total_amount",
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$warehouse._id",
        warehouse: {
          $first: "$warehouse",
        },
        total_amount: {
          $sum: "$total_amount",
        },
        cash_sales: {
          $sum: "$cash_sales",
        },
        charge_sales: {
          $sum: "$charge_sales",
        },
        check_sales: {
          $sum: "$check_sales",
        },
      },
    },
    {
      $project: {
        _id: 0,
        warehouse: "$warehouse.name",
        sales: "$total_amount",
        cash_sales: "$cash_sales",
        charge_sales: "$charge_sales",
        check_sales: "$check_sales",
      },
    },
    {
      $sort: {
        "warehouse.name": 1,
      },
    },
  ]).exec(cb);
};

module.exports.getMonthlySalesOfCurrentYear = async (cb) => {
  const now = moment();
  let warehouse_sales = await Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        warehouse: {
          $ne: null,
        },
        date: {
          $gte: now.clone().startOf("year").toDate(),
          $lte: now.clone().endOf("year").toDate(),
        },
      },
    },
    {
      $group: {
        _id: {
          warehouse: "$warehouse._id",
          date: {
            $dateToString: {
              date: "$date",
              timezone: "Asia/Manila",
              format: "%m/%Y",
            },
          },
        },
        warehouse: {
          $first: "$warehouse",
        },
        sales: {
          $sum: "$total_amount",
        },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        sales: {
          $push: {
            warehouse: "$warehouse.name",
            amount: "$sales",
          },
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]).exec();

  warehouse_sales = warehouse_sales.map((o) => {
    let form_data = {
      date: o._id,
    };

    (o.sales || []).forEach((sale) => {
      form_data[sale.warehouse] = sale.amount;
    });

    return {
      ...form_data,
    };
  });

  cb(null, warehouse_sales);
};

module.exports.getWarehouses = (cb) => {
  Warehouse.find().sort({ name: 1 }).exec(cb);
};
