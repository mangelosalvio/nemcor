const express = require("express");
const router = express.Router();
const StockReleasing = require("./../../models/StockReleasing");
const StockTransfer = require("./../../models/StockTransfer");
const Sales = require("./../../models/Sales");
const StockReceiving = require("./../../models/StockReceiving");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const update_inventory = require("./../../library/inventory");
const round = require("./../../utils/round");
const validateInput = require("./../../validators/stock_releasing");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const Model = StockReleasing;

const seq_key = "stock_releasing_no";
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

/**
 * generate sales from sales order
 */
router.put("/stocks-receiving", (req, res) => {
  const user = req.body.user;
  Model.findOne({
    _id: ObjectId(req.body._id),
  })
    .then((record) => {
      const {
        date,
        warehouse,
        customer,
        items,
        total_amount,
      } = record.toObject();

      const body = {
        date,
        warehouse,
        customer,
        items,
        total_amount,
        stock_release: record,
      };

      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Added by ${user.name} on ${datetime.format("LLL")}`;
      const logs = [
        {
          user,
          datetime,
          log,
        },
      ];

      Counter.increment("rr_no").then((result) => {
        const items = [...body.items].map((item) => {
          const quantity = round(
            item.quantity - (item.total_quantity_received || 0)
          );

          const amount = round(quantity * item.price);

          return {
            ...item,
            quantity,
            amount,
          };
        });

        const newRecord = new StockReceiving({
          ...body,
          items,
          rr_no: result.next,
          logs,
        });
        newRecord
          .save()
          .then((record) => {
            update_inventory.updateItemsInCollection({
              record: record.toObject(),
              ItemModel: StockReleasing,
              item_collection: "stock_release",
              items_column_key: "total_quantity_received",
            });
            return res.json(record);
          })
          .catch((err) => console.log(err));
      });
    })
    .catch((err) => {
      return res.status(401).json(err);
    });
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

router.post("/:id/print-status", (req, res) => {
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    if (record) {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);

      const printed = {
        user,
        datetime,
      };

      record.set({
        printed,
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

router.post("/:id/reconcile", (req, res) => {
  const { reconciled, record } = req.body;

  Model.updateOne(
    {
      _id: ObjectId(record._id),
    },
    {
      $set: {
        reconciled,
      },
    }
  ).exec();

  return res.json(record);
});

router.post("/:id/update-status", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.status.user;

  Model.findById(req.params.id).then((record) => {
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

      const status = {
        ...req.body.status,
        datetime,
      };

      record.set({
        ...body,
        status,
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

router.post("/liquidation", (req, res) => {
  const {
    period_covered,
    customer,
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
        reconciled: true,
        ...(customer && {
          "customer._id": ObjectId(customer._id),
        }),
      },
    },
    {
      $sort: {
        [seq_key]: 1,
      },
    },
  ]).then(async (records) => {
    async.map(
      records,
      async (record) => {
        const {
          releases,
          customer_collections,
          sales_returns,
        } = await update_inventory.getStockReleasesAndCollectionsFromDeliveries(
          {
            sale: {
              ...record.sale,
              _id: ObjectId(record.sale._id),
            },
          }
        );

        return {
          ...record,
          releases,
          customer_collections,
          sales_returns,
        };
      },
      (err, results) => {
        if (err) {
          return res.status(401).json(err);
        }

        return res.json(results);
      }
    );
  });
});

router.post("/history", (req, res) => {
  const { period_covered, customer, item_type } = req.body;

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
        ...(customer && {
          "customer._id": ObjectId(customer._id),
        }),
        ...(item_type && {
          "items.stock.item_type": item_type,
        }),
      },
    },
    {
      $sort: {
        [seq_key]: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/transactions", (req, res) => {
  const { period_covered, customer } = req.body;

  Model.aggregate([
    {
      $match: {
        date: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[1]).endOf("day").toDate(),
        },
        ...(customer && {
          "customer._id": ObjectId(customer._id),
        }),
      },
    },

    {
      $sort: {
        [seq_key]: 1,
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
          if (record.sale) {
            update_inventory
              .updateItemsInCollection({
                record: old_record,
                ItemModel: Sales,
                item_collection: "sale",
                items_column_key: "total_released_quantity",
                is_inc: false,
              })
              .then(() => {
                update_inventory.updateItemsInCollection({
                  record: record.toObject(),
                  ItemModel: Sales,
                  item_collection: "sale",
                  items_column_key: "total_released_quantity",
                });
              });
          }

          if (!isEmpty(record.stocks_receiving)) {
            update_inventory
              .updateItemsInCollection({
                record: {
                  ...old_record.stocks_receiving,
                  items: [...old_record.items],
                },
                ItemModel: StockReleasing,
                item_collection: "stock_release",
                items_column_key: "total_quantity_received",
              })
              .then(() => {
                update_inventory.updateItemsInCollection({
                  record: {
                    ...record.stocks_receiving,
                    items: [...record.items],
                  },
                  ItemModel: StockReleasing,
                  item_collection: "stock_release",
                  items_column_key: "total_quantity_received",
                  is_inc: false,
                });
              });
          }

          if (record.stock_transfer) {
            update_inventory
              .updateItemsInCollection({
                record: old_record,
                ItemModel: StockTransfer,
                item_collection: "stock_transfer",
                items_column_key: "total_released_quantity",
                items_column_case_key: "total_released_case_quantity",
                is_inc: false,
              })
              .then(() => {
                update_inventory.updateItemsInCollection({
                  record: record.toObject(),
                  ItemModel: StockTransfer,
                  item_collection: "stock_transfer",
                  items_column_key: "total_released_quantity",
                  items_column_case_key: "total_released_case_quantity",
                });
              });
          }

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
      if (record.sale) {
        update_inventory.updateItemsInCollection({
          record: record.toObject(),
          ItemModel: Sales,
          item_collection: "sale",
          items_column_key: "total_released_quantity",
          is_inc: false,
        });
      }

      if (!isEmpty(record.stocks_receiving)) {
        update_inventory.updateItemsInCollection({
          record: {
            ...record.stocks_receiving,
            items: [...record.items],
          },
          ItemModel: StockReleasing,
          item_collection: "stock_release",
          items_column_key: "total_quantity_received",
        });
      }

      if (record.stock_transfer) {
        update_inventory.updateItemsInCollection({
          record: record.toObject(),
          ItemModel: StockTransfer,
          item_collection: "stock_transfer",
          items_column_key: "total_released_quantity",
          items_column_case_key: "total_released_case_quantity",
          is_inc: false,
        });
      }

      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
