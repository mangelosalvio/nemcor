const express = require("express");
const router = express.Router();
const PhysicalCount = require("./../../models/PhysicalCount");
const StockReceiving = require("./../../models/StockReceiving");
const StockReleasing = require("./../../models/StockReleasing");
const StockTransfer = require("./../../models/StockTransfer");
const Sales = require("./../../models/Sales");

const Wastage = require("./../../models/Wastage");
const Production = require("./../../models/Production");
const PurchaseReturn = require("./../../models/PurchaseReturn");
const InventoryAdjustment = require("./../../models/InventoryAdjustment");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const update_inventory = require("./../../library/inventory");
const validateInput =
  require("./../../validators/physical_counts").validateInput;
const validateInventoryLedger =
  require("./../../validators/physical_counts").validateInventoryLedger;
const validateStockCard =
  require("./../../validators/physical_counts").validateStockCard;
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const numeral = require("numeral");
const uniqBy = require("lodash").uniqBy;
const orderBy = require("lodash").orderBy;
const forOwn = require("lodash").forOwn;
const {
  getBranchInventoryBalanceList,
  getBranchStockCard,
  getBranchInventoryBalance,
} = require("../../library/inventory_functions");
const { getBodegaWarehouse } = require("../../library/setting_functions");
const { adjustActualCount } = require("../../library/update_functions");
const { takeRight } = require("lodash");
const { FINALIZED } = require("../../config/constants");

const Model = PhysicalCount;

const seq_key = "pc_no";
const ObjectId = mongoose.Types.ObjectId;
router.get("/:id/print", (req, res) => {
  async.parallel(
    {
      purchase_order: (cb) => {
        Model.findById(req.params.id).exec(cb);
      },
      requesters: (cb) => {
        Model.aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId(req.params.id),
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $group: {
              _id: "$items.purchase_request.requested_by",
              name: {
                $first: "$items.purchase_request.requested_by",
              },
            },
          },
        ]).exec(cb);
      },
    },
    (err, record) => {
      return res.json(record);
    }
  );
});

router.get("/listing", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        $or: [
          {
            [seq_key]: parseInt(req.query.s),
          },
          {
            po_ref: req.query.s,
          },
        ],
      };

  Model.find(form_data)
    .sort({ [seq_key]: 1 })
    .limit(100)
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  let form_data = isEmpty(req.query.s)
    ? {}
    : {
        $or: [
          {
            [seq_key]: parseInt(req.query.s),
          },
          {
            po_ref: req.query.s,
          },
        ],
      };

  form_data = {
    ...form_data,
    /* deleted: {
      $exists: false
    } */
  };

  Model.find(form_data)
    .sort({ [seq_key]: -1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => res.status(401).json(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }
  const body = filterId(req);
  const user = req.body.user;

  const datetime = moment.tz(moment(), process.env.TIMEZONE);
  const log = `Added by ${user.name} on ${datetime.format("LLL")}`;
  const logs = [
    {
      user,
      datetime,
      log,
    },
  ];

  Counter.increment(seq_key).then((result) => {
    const newRecord = new Model({
      ...body,
      [seq_key]: result.next,
      logs,
    });
    newRecord
      .save()
      .then((record) => {
        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
});

router.post("/:id/dates", (req, res) => {
  Model.find({
    "warehouse._id": ObjectId(req.params.id),
    deleted: {
      $exists: false,
    },
  })
    .sort({ date: 1 })
    .then((records) => {
      return res.json(records.map((o) => moment(o.date).format("MM/DD/YYYY")));
    });
});

router.post("/:id/update-status", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.status.user;

  Model.findById(req.params.id).then(async (record) => {
    if (record) {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Modified by ${user.name} on ${datetime.format("LLL")}`;

      let logs = [
        ...record.logs,
        {
          user,
          datetime,
          log,
        },
      ];
      logs = takeRight(logs, 10);

      const body = {
        ...filtered_body,
        logs,
      };

      const status = {
        ...req.body.status,
        datetime,
      };

      delete body.__v;

      record.set({
        ...body,
        //status,
      });

      if (record.status?.approval_status === FINALIZED) {
        await adjustActualCount({ _id: record._id });
      }

      record
        .save()
        .then(async (record) => {
          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.post("/current-stock-balance", async (req, res) => {
  const stock = req.body.stock;

  const warehouse = await getBodegaWarehouse();
  const balance = await getBranchInventoryBalance(
    stock,
    moment().toDate(),
    warehouse
  );

  return res.json(balance);
});

router.post("/branch-stock-card", async (req, res) => {
  const { period_covered, stock, warehouse } = req.body;

  const records = await getBranchStockCard(stock, period_covered, warehouse);

  return res.json(records);
});

router.post("/branch-inventory-balance-list", async (req, res) => {
  const { date, warehouse, categories, ...rest } = req.body;

  const records = await getBranchInventoryBalanceList({
    date,
    warehouse,
    categories,
    ...rest,
  });

  return res.json(records);
});

router.post("/stock-card", (req, res) => {
  const date = moment(req.body.date, "MM/DD/YYYY");
  const warehouse = req.body.warehouse;
  const stock = req.body.stock;

  const { isValid, errors } = validateStockCard(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const KEY_TRANSACTION = {
    physical_count: {
      label: "PHYSICAL COUNT",
      in: true,
    },
    receiving_report: {
      label: "RECEIVING REPORT",
      in: true,
    },
    stock_transfer_in: {
      label: "STOCKS TRANSFER IN",
      in: true,
    },
    stock_transfer_out: {
      label: "STOCKS TRANSFER OUT",
      in: false,
    },
    stock_release: {
      label: "STOCKS RELEASE",
      in: false,
    },
    consumed_production: {
      label: "CONSUMED PRODUCTION",
      in: false,
    },
    produced_production: {
      label: "PRODUCED PRODUCTION",
      in: true,
    },
    wastage: {
      label: "WASTAGE",
      in: false,
    },
    inventory_adjustments: {
      label: "ADJUSTMENTS",
      in: true,
    },
    purchase_return: {
      label: "PURCHASE RETURN",
      in: false,
    },
    sales: {
      label: "SALES",
      in: false,
    },
    sales_returns: {
      label: "SALES RETURNS",
      in: true,
    },
  };

  async.parallel(
    {
      physical_count: (cb) => {
        PhysicalCount.aggregate([
          {
            $match: {
              date: {
                $gte: date.clone().startOf("day").toDate(),
                $lte: date.clone().endOf("day").toDate(),
              },
              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["PC#", { $toString: "$pc_no" }],
              },
            },
          },
        ]).exec(cb);
      },

      receiving_report: (cb) => {
        StockReceiving.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),

              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["RR#", { $toString: "$rr_no" }],
              },

              client: {
                $ifNull: ["$supplier.name", "$customer.name"],
              },
            },
          },
        ]).exec(cb);
      },

      /* stock_release: (cb) => {
        StockReleasing.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),

              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["SRS#", { $toString: "$stock_releasing_no" }],
              },

              client: {
                $ifNull: ["$supplier.name", "$customer.name"],
              },
            },
          },
        ]).exec(cb);
      }, */

      purchase_return: (cb) => {
        PurchaseReturn.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),

              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["PR#", { $toString: "$pr_no" }],
              },
              client: "$supplier.name",
            },
          },
        ]).exec(cb);
      },

      stock_transfer_in: (cb) => {
        StockTransfer.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "to_warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["ST#", { $toString: "$stock_transfer_no" }],
              },
            },
          },
        ]).exec(cb);
      },

      stock_transfer_out: (cb) => {
        StockTransfer.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "from_warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["ST#", { $toString: "$stock_transfer_no" }],
              },
            },
          },
        ]).exec(cb);
      },

      inventory_adjustments: (cb) => {
        InventoryAdjustment.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["ADJ#", { $toString: "$adj_no" }],
              },
            },
          },
        ]).exec(cb);
      },

      wastage: (cb) => {
        Wastage.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.stock._id": mongoose.Types.ObjectId(stock._id),
                },
                {
                  "items.stock.unit_product._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.stock.unit_product._id"],
                  },
                  "$items.stock",
                  "$items.stock.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  "$items.quantity",
                  {
                    $ifNull: ["$items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$items.stock._id",
              date: "$date",
              stock: "$items.stock",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["WS#", { $toString: "$wastage_no" }],
              },
            },
          },
        ]).exec(cb);
      },

      consumed_production: (cb) => {
        Production.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              consumed_items: {
                $elemMatch: {
                  $exists: true,
                },
              },

              $or: [
                {
                  "consumed_items.stock._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
                {
                  "consumed_items.stock.unit_product._id":
                    mongoose.Types.ObjectId(stock._id),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$consumed_items",
            },
          },
          {
            $addFields: {
              "consumed_items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$consumed_items.stock.unit_product._id"],
                  },
                  "$consumed_items.stock",
                  "$consumed_items.stock.unit_product",
                ],
              },
              "consumed_items.quantity": {
                $multiply: [
                  "$consumed_items.quantity",
                  {
                    $ifNull: ["$consumed_items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "consumed_items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$consumed_items.stock._id",
              date: "$date",
              stock: "$consumed_items.stock",
              case_quantity: {
                $ifNull: ["$consumed_items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$consumed_items.quantity", 0],
              },
              reference: {
                $concat: ["PROD#", { $toString: "$production_no" }],
              },
            },
          },
        ]).exec(cb);
      },
      produced_production: (cb) => {
        Production.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                date: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
              deleted: {
                $exists: false,
              },
              produced_items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "produced_items.stock._id": mongoose.Types.ObjectId(
                    stock._id
                  ),
                },
                {
                  "produced_items.stock.unit_product._id":
                    mongoose.Types.ObjectId(stock._id),
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$produced_items",
            },
          },
          {
            $addFields: {
              "produced_items.stock": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$produced_items.stock.unit_product._id"],
                  },
                  "$produced_items.stock",
                  "$produced_items.stock.unit_product",
                ],
              },
              "produced_items.quantity": {
                $multiply: [
                  "$produced_items.quantity",
                  {
                    $ifNull: ["$produced_items.stock.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "produced_items.stock._id": mongoose.Types.ObjectId(stock._id),
            },
          },
          {
            $project: {
              _id: "$produced_items.stock._id",
              date: "$date",
              stock: "$produced_items.stock",
              case_quantity: {
                $ifNull: ["$produced_items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$produced_items.quantity", 0],
              },
              reference: {
                $concat: ["PROD#", { $toString: "$production_no" }],
              },
            },
          },
        ]).exec(cb);
      },
      sales: (cb) => {
        Sales.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                datetime: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.product._id": stock._id,
                },
                {
                  "items.product.unit_product._id": stock._id,
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.product": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.product.unit_product._id"],
                  },
                  "$items.product",
                  "$items.product.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  { $toDouble: "$items.quantity" },
                  {
                    $ifNull: ["$items.product.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.product._id": stock._id,
            },
          },
          {
            $project: {
              _id: "$items.product._id",
              date: "$date",
              stock: "$items.product",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: ["$items.quantity", 0],
              },
              reference: {
                $concat: ["SI#", { $toString: "$sales_id" }],
              },
            },
          },
        ]).exec(cb);
      },
      sales_returns: (cb) => {
        SalesReturn.aggregate([
          {
            $match: {
              ...(!isEmpty(req.body.date) && {
                datetime: {
                  $gt: date.clone().endOf("day").toDate(),
                },
              }),
              deleted: {
                $exists: false,
              },
              items: {
                $elemMatch: {
                  $exists: true,
                },
              },
              $or: [
                {
                  "items.product._id": stock._id,
                },
                {
                  "items.product.unit_product._id": stock._id,
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $addFields: {
              "items.product": {
                $cond: [
                  {
                    //evaluates true if there is no unit product
                    $not: ["$items.product.unit_product._id"],
                  },
                  "$items.product",
                  "$items.product.unit_product",
                ],
              },
              "items.quantity": {
                $multiply: [
                  { $toDouble: "$items.quantity" },
                  {
                    $ifNull: ["$items.product.pieces_in_case", 1],
                  },
                ],
              },
            },
          },
          {
            $match: {
              "items.product._id": stock._id,
            },
          },
          {
            $project: {
              _id: "$items.product._id",
              date: "$date",
              stock: "$items.product",
              case_quantity: {
                $ifNull: ["$items.case_quantity", 0],
              },
              quantity: {
                $ifNull: [{ $abs: "$items.quantity" }, 0],
              },
              reference: {
                $concat: ["SR#", { $toString: "$sales_id" }],
              },
            },
          },
        ]).exec(cb);
      },
    },
    (err, results) => {
      if (err) {
        return res.status(401).json(err);
      }

      let transactions = [];

      /**
       * Do not include physical count if date is not specified
       */
      if (isEmpty(req.body.date)) {
        delete results.physical_count;
      }

      let physical_count = results.physical_count || [];
      physical_count = physical_count.map((o) => {
        return {
          ...o,
          key: "physical_count",
        };
      });
      delete results.physical_count;

      forOwn(results, (value, key) => {
        /**
         * only record sales on Display Area Warehouse
         */

        if (
          (key === "sales" || key === "sales_returns") &&
          warehouse.name !== "Display Area"
        ) {
          return;
        }

        transactions = [...transactions, ...value.map((o) => ({ ...o, key }))];
      });

      transactions = orderBy(
        transactions,
        [
          (record) => moment(record.date).toDate(),
          /* (record) => {
            return record.sales_no || 0;
          }, */
        ],
        ["asc" /*  "asc" */]
      );

      transactions = [...physical_count, ...transactions];

      transactions.reduce((acc, o, index, array) => {
        let balance;

        if (KEY_TRANSACTION[o.key].in) {
          array[index]["in"] = {
            case_quantity: o.case_quantity || 0,
            quantity: o.quantity || 0,
          };
          array[index]["out"] = {
            case_quantity: 0,
            quantity: 0,
          };

          balance = acc + o.quantity;
        } else {
          array[index]["out"] = {
            case_quantity: o.case_quantity || 0,
            quantity: o.quantity || 0,
          };
          array[index]["in"] = {
            case_quantity: 0,
            quantity: 0,
          };

          balance = acc - o.quantity;
        }

        balance =
          acc +
          array[index]["in"]["case_quantity"] * (stock.pieces_in_case || 0) +
          array[index]["in"]["quantity"] -
          array[index]["out"]["case_quantity"] * (stock.pieces_in_case || 0) -
          array[index]["out"]["quantity"];

        array[index]["transaction"] = KEY_TRANSACTION[o.key].label;
        array[index]["balance"] = balance;

        let case_quantity = 0;
        let quantity = 0;
        if (!isEmpty(stock.pieces_in_case || 0) && stock.pieces_in_case > 1) {
          case_quantity = parseInt(balance / stock.pieces_in_case);
          quantity = balance % stock.pieces_in_case;
        } else {
          quantity = balance;
        }

        array[index]["balance_breakdown"] = {
          case_quantity: case_quantity,
          quantity: quantity,
        };

        return balance;
      }, 0);

      return res.json({
        date: req.body.date,
        warehouse: req.body.warehouse,
        stock: req.body.stock,
        result: transactions,
      });
    }
  );
});

router.post("/inventory-ledger", async (req, res) => {
  const { isValid, errors } = validateInventoryLedger(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const inventory_date = req.body.date
    ? moment(req.body.date, "MM/DD/YYYY").toDate()
    : null;

  async.parallel(
    {
      inventory: (cb) => {
        update_inventory
          .getInventoryTransactions({
            inventory_date,
            warehouse: req.body.warehouse,
          })
          .then((inventory) => {
            cb(null, inventory);
          });
      },
    },
    (err, results) => {
      if (err) return res.status(401).json(err);
      return res.json(results.inventory);
    }
  );
});

router.post("/history", (req, res) => {
  const {
    period_covered,
    search_item_name,
    search_supplier_name,
    search_prq_no,
    search_project_name,
    search_po_no,
  } = req.body;

  Model.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        date: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[1]).endOf("day").toDate(),
        },
      },
    },
    {
      $unwind: {
        path: "$items",
      },
    },
    {
      $match: {
        ...(search_supplier_name && {
          "supplier.name": {
            $regex: new RegExp("^" + search_supplier_name, "i"),
          },
        }),
        ...(search_project_name && {
          "project.project_code": search_project_name,
        }),
        ...(search_item_name && {
          "items.stock.name": {
            $regex: new RegExp(search_item_name, "i"),
          },
        }),
        ...(search_prq_no && {
          "items.purchase_request.prq_no": parseInt(search_prq_no),
        }),
        ...(search_po_no && {
          po_no: parseInt(search_po_no),
        }),
      },
    },
    {
      $sort: {
        po_no: -1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});
router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      "customer.name": {
        $regex: new RegExp(req.body.s, "i"),
      },
    }),
  };

  Model.paginate(form_data, {
    sort: {
      [seq_key]: -1,
    },
    page,
    limit: 10,
  })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const filtered_body = filterId(req);
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    const old_record = { ...record.toObject() };
    if (record) {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Modified by ${user.name} on ${datetime.format("LLL")}`;

      const logs = [
        ...record.logs,
        {
          user,
          datetime,
          log,
        },
      ];

      const body = {
        ...filtered_body,
        logs,
      };

      record.set({
        ...body,
      });

      record
        .save()
        .then((record) => {
          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  Model.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted: {
          date: moment.tz(moment(), process.env.TIMEZONE),
          user: req.body.user,
        },
      },
    },
    {
      new: true,
    }
  )
    .then((record) => {
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
