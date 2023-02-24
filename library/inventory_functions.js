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
const { CANCELLED, FINALIZED, CLOSED } = require("../config/constants");

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

module.exports.getBranchInventoryBalance = ({ stock, date, branch }) => {
  return new Promise(async (resolve, reject) => {
    let from_date = null;
    let to_date = moment(date).endOf("day").toDate();

    StockReceiving.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "branch._id": ObjectId(branch._id),
          "items.stock._id": ObjectId(stock._id),
          "status.approval_status": {
            $ne: CANCELLED,
          },
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
      {
        $unionWith: {
          coll: "purchase_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
          coll: "stock_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
          coll: "display_delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
          coll: "delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
                "items.is_damaged": {
                  $ne: true,
                },
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
          coll: "replacement_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
          coll: "sales_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
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
                "branch._id": ObjectId(branch._id),
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
          coll: "physical_counts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": CLOSED,
                "branch._id": ObjectId(branch._id),
                application_date: {
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
                  $sum: "$items.adjustment_quantity",
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
    ])
      .allowDiskUse(true)
      .then((records) => {
        if (records.length > 0) {
          return resolve(records[0].quantity);
        }

        return resolve(0);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getBranchStockCard = ({
  branch,
  period_covered,
  stock,
  ...rest
}) => {
  return new Promise(async (resolve, reject) => {
    let from_date = moment(period_covered[0])
      .subtract({ day: 1 })
      .endOf("day")
      .toDate();

    let to_date = moment(period_covered[1]).endOf("day").toDate();

    const beginning_balance = await this.getBranchInventoryBalance({
      stock,
      date: moment(period_covered[0])
        .subtract({ day: 1 })
        .endOf("day")
        .toDate(),
      branch,
    });

    StockReceiving.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "branch._id": ObjectId(branch._id),
          "items.stock._id": ObjectId(stock._id),
          "status.approval_status": {
            $ne: CANCELLED,
          },
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
          transaction: "Warehouse Receipt",
        },
      },
      {
        $project: {
          date: "$date",
          transaction: "$transaction",
          reference: {
            $concat: ["WR#", { $toString: "$rr_no" }],
          },
          quantity: "$items.quantity",
          external_reference: "$reference",
        },
      },
      {
        $unionWith: {
          coll: "purchase_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Purchase Returns",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["PR#", { $toString: "$pr_no" }],
                },
                quantity: {
                  $subtract: [0, "$items.quantity"],
                },
                external_reference: "$reference",
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "stock_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Stock Transfers",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["ST#", { $toString: "$stock_transfer_no" }],
                },
                quantity: {
                  $subtract: [0, "$items.quantity"],
                },
                external_reference: "$reference",
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "display_delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Display Delivery Receipt",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["DS#", { $toString: "$display_dr_no" }],
                },
                quantity: {
                  $subtract: [0, "$items.quantity"],
                },
                external_reference: "$reference",
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                "items.is_damaged": {
                  $ne: true,
                },
              },
            },
            {
              $addFields: {
                transaction: {
                  $concat: ["$payment_type", " ", "Sales Invoice"],
                },
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: "$branch_reference",
                quantity: {
                  $subtract: [0, "$items.quantity"],
                },
                external_reference: "$reference",
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "replacement_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Replacement Form",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: "$branch_reference",
                quantity: {
                  $subtract: [0, "$items.quantity"],
                },
                external_reference: "$reference",
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "sales_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Return Stock",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["RET#", { $toString: "$return_no" }],
                },
                quantity: "$items.quantity",
                external_reference: "$reference",
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
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": {
                  $ne: CANCELLED,
                },
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
                transaction: "Inventory Adjustments",
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
                external_reference: "$reference",
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "physical_counts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "branch._id": ObjectId(branch._id),
                "items.stock._id": ObjectId(stock._id),
                "status.approval_status": CLOSED,
                application_date: {
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
                transaction: "Physical Count",
              },
            },
            {
              $project: {
                date: "$application_date",
                transaction: "$transaction",
                reference: {
                  $concat: ["PC#", { $toString: "$pc_no" }],
                },
                quantity: "$items.adjustment_quantity",
                external_reference: "$reference",
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
  branch,
  stock_ids = [],
  ...rest
}) => {
  return new Promise(async (resolve, reject) => {
    let from_date = null;
    let to_date = moment(date).endOf("day").toDate();

    const _stock_ids = stock_ids.map((o) => ObjectId(o));

    StockReceiving.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "branch._id": ObjectId(branch._id),
          "status.approval_status": {
            $ne: CANCELLED,
          },
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
          ...((_stock_ids || [])?.length > 0 && {
            "items.stock._id": {
              $in: _stock_ids,
            },
          }),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          ...((_stock_ids || [])?.length > 0 && {
            "items.stock._id": {
              $in: _stock_ids,
            },
          }),
        },
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
      {
        $unionWith: {
          coll: "purchase_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
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
          coll: "stock_transfers",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
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
          coll: "display_delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
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
          coll: "delivery_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
                "items.is_damaged": {
                  $ne: true,
                },
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
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
          coll: "replacement_receipts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
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
          coll: "sales_returns",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
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
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
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
          coll: "physical_counts",
          pipeline: [
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                "status.approval_status": CLOSED,
                "branch._id": ObjectId(branch._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
            },
            {
              $unwind: "$items",
            },
            {
              $match: {
                ...((_stock_ids || [])?.length > 0 && {
                  "items.stock._id": {
                    $in: _stock_ids,
                  },
                }),
              },
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
          localField: "stock._id",
          foreignField: "_id",
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
      // {
      //   $match: {
      //     ...(rest?.supplier?._id && {
      //       "stock.supplier._id": ObjectId(rest.supplier?._id),
      //     }),
      //   },
      // },
      {
        $sort: {
          "stock.name": 1,
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
