const PhysicalCount = require("../models/PhysicalCount");
const moment = require("moment");
const StockReceiving = require("../models/StockReceiving");
const StockReleasing = require("../models/StockReleasing");
const PurchaseReturn = require("../models/PurchaseReturn");

const Production = require("../models/Production");
const async = require("async");
const { sortBy } = require("lodash");
const mongoose = require("mongoose");
const { getCurrentWarehouse } = require("./setting_functions.js");
const round = require("../utils/round");
const Sales = require("../models/Sales");
const { CANCELLED, FINALIZED } = require("../config/constants");

const ObjectId = mongoose.Types.ObjectId;

module.exports.getLatestPhysicalCountOfBranch = (date, warehouse) => {
  return new Promise((resolve, reject) => {
    PhysicalCount.findOne(
      {
        "warehouse._id": ObjectId(warehouse._id),
        deleted: {
          $exists: false,
        },
        ...(date && {
          date: {
            $lt: moment(date).endOf("day").toDate(),
          },
        }),
      },
      {},
      {
        sort: {
          _id: -1,
        },
      }
    )
      .then((record) => resolve(record))
      .catch((err) => reject(err));
  });
};

module.exports.getBranchInventoryBalance = (stock, date, warehouse) => {
  return new Promise(async (resolve, reject) => {
    let from_date = null;
    let to_date = moment(date).endOf("day").toDate();

    const query = [
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "warehouse._id": ObjectId(warehouse._id),
          "items.stock._id": ObjectId(stock._id),
          "status.approval_status": FINALIZED,
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.stock._id": ObjectId(stock._id),
        },
      },
      {
        $group: {
          _id: null,
          quantity: {
            $sum: "$items.adjustment_quantity",
          },
        },
      },
      {
        $unionWith: {
          coll: "tanker_withdrawals",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "source_depot_items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$source_depot_items",
            },
            {
              $match: {
                "source_depot_items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: { $subtract: [0, "$source_depot_items.quantity"] },
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: {
                    $subtract: [0, "$items.quantity"],
                  },
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "to_warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "company_uses",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: {
                    $subtract: [0, "$items.quantity"],
                  },
                },
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "inventory_adjustments",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                "items.stock._id": ObjectId(stock._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $group: {
                _id: null,
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },

      {
        $group: {
          _id: null,
          quantity: {
            $sum: "$quantity",
          },
        },
      },
    ];

    PhysicalCount.aggregate(query)
      .then((records) => {
        if (records.length > 0) {
          return resolve(records[0].quantity);
        }

        return resolve(0);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getBranchStockCard = (stock, period_covered, warehouse) => {
  return new Promise(async (resolve, reject) => {
    let from_date = moment(period_covered[0])
      .subtract({ day: 1 })
      .endOf("day")
      .toDate();

    let to_date = moment(period_covered[1]).endOf("day").toDate();

    const beginning_balance = await this.getBranchInventoryBalance(
      stock,
      moment(period_covered[0]).subtract({ day: 1 }).endOf("day").toDate(),
      warehouse
    );

    PhysicalCount.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "warehouse._id": ObjectId(warehouse._id),
          "items.stock._id": ObjectId(stock._id),
          "status.approval_status": FINALIZED,
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.stock._id": ObjectId(stock._id),
        },
      },
      {
        $addFields: {
          transaction: "Physical Count",
        },
      },
      {
        $project: {
          date: "$date",
          transaction: "$transaction",
          reference: {
            $concat: ["PC#", { $toString: "$pc_no" }],
          },
          quantity: "$items.adjustment_quantity",
        },
      },
      {
        $unionWith: {
          coll: "tanker_withdrawals",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "source_depot_items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$source_depot_items",
            },
            {
              $match: {
                "source_depot_items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Tanker Scheduling",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["TS#", { $toString: "$tw_no" }],
                },
                quantity: { $subtract: [0, "$source_depot_items.quantity"] },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Warehouse Transfers",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["WT#", { $toString: "$wt_no" }],
                },
                quantity: { $subtract: [0, "$items.quantity"] },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "to_warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Warehouse Transfers",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["WT#", { $toString: "$wt_no" }],
                },
                quantity: "$items.quantity",
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "warehouse_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Warehouse Return",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["WR#", { $toString: "$ds_no" }],
                },
                quantity: "$items.quantity",
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "company_uses",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "items.stock._id": ObjectId(stock._id),
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Company Use",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["Doc#", { $toString: "$company_use_no" }],
                },
                quantity: { $subtract: [0, "$items.quantity"] },
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "inventory_adjustments",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                "items.stock._id": ObjectId(stock._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                "items.stock._id": ObjectId(stock._id),
              },
            },
            {
              $addFields: {
                transaction: "Adjustments",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["ADJ#", { $toString: "$adj_no" }],
                },
                quantity: "$items.quantity",
              },
            },
          ],
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ])
      .then((records) => {
        let updated_records = [
          { transaction: "Opening Balance", quantity: beginning_balance },
          ...records,
        ];

        updated_records.reduce((acc, o, index, array) => {
          acc = round(acc + o.quantity);
          array[index]["balance"] = acc;
          return acc;
        }, 0);

        return resolve(updated_records);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

module.exports.getBranchInventoryBalanceList = ({
  date,
  warehouse,
  categories = [],
  ...rest
}) => {
  return new Promise(async (resolve, reject) => {
    let from_date = null;
    let to_date = moment(date).endOf("day").toDate();

    PhysicalCount.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "warehouse._id": ObjectId(warehouse._id),
          "status.approval_status": FINALIZED,
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $limit: 1,
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.stock._id",
          stock: {
            $first: "$items.stock",
          },
          quantity: {
            $sum: "$items.adjustment_quantity",
          },
        },
      },
      {
        $unionWith: {
          coll: "tanker_withdrawals",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$source_depot_items",
            },
            {
              $group: {
                _id: "$source_depot_items.stock._id",
                stock: {
                  $first: "$source_depot_items.stock",
                },
                quantity: {
                  $sum: { $subtract: [0, "$source_depot_items.quantity"] },
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "to_warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "warehouse_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: { $subtract: [0, "$items.quantity"] },
                },
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "warehouse_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "company_uses",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: { $subtract: [0, "$items.quantity"] },
                },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "inventory_adjustments",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "warehouse._id": ObjectId(warehouse._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
              },
            },
          ],
        },
      },

      {
        $group: {
          _id: "$_id",
          stock: {
            $first: "$stock",
          },
          quantity: {
            $sum: "$quantity",
          },
        },
      },
      {
        $lookup: {
          from: "products",
          let: {
            stock: "$stock",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    "$_id",
                    {
                      $toObjectId: "$$stock._id",
                    },
                  ],
                },
              },
            },
          ],
          as: "stock",
        },
      },
      {
        $addFields: {
          stock: {
            $arrayElemAt: ["$stock", 0],
          },
        },
      },
      {
        $match: {
          ...(rest?.supplier?._id && {
            "stock.supplier._id": ObjectId(rest.supplier?._id),
          }),
        },
      },
      {
        $sort: {
          "stock.sku": 1,
        },
      },
    ])
      .then((records) => {
        return resolve(records);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

module.exports.getBranchSales = (period_covered, warehouse) => {
  const from_date = moment(period_covered[0]).startOf("day").toDate();
  const to_date = moment(period_covered[1]).endOf("day").toDate();

  return new Promise((resolve, reject) => {
    Sales.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          datetime: {
            $gte: from_date,
            $lte: to_date,
          },
          "warehouse._id": ObjectId(warehouse._id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.product._id",
          stock: {
            $first: "$items.product",
          },
          quantity: {
            $sum: "$items.quantity",
          },
          amount: {
            $sum: "$items.net_amount",
          },
        },
      },
      {
        $sort: {
          "stock.name": 1,
        },
      },
      {
        $group: {
          _id: "$stock.category._id",
          category: {
            $first: "$stock.category",
          },
          items: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $sort: {
          "category.name": 1,
        },
      },
    ])
      .then((records) => resolve(records))
      .catch((err) => reject(err));
  });
};
