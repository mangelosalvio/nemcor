const express = require("express");
const router = express.Router();
const InventoryAdjustment = require("./../../models/InventoryAdjustment");

const StockReleasing = require("./../../models/StockReleasing");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/inventory_adjustments");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const StockTransfer = require("../../models/StockTransfer");
const PurchaseOrder = require("../../models/PurchaseOrder");
const printing_functions = require("../../utils/printing_functions");
const { CANCELLED, OPEN } = require("../../config/constants");
const CompanyCounter = require("../../models/CompanyCounter");

const Model = InventoryAdjustment;
const seq_key = "adj_no";
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
 * generate stock releasing form
 */
router.put("/stock-releasing", (req, res) => {
  const user = req.body.user;
  Model.findOne({
    _id: ObjectId(req.body._id),
  })
    .then((record) => {
      const stocks_receiving = record.toObject();

      const { date, warehouse, customer, items, total_amount, stock_release } =
        record.toObject();

      const body = {
        date,
        warehouse,
        customer,
        items,
        total_amount,
        sale: stock_release.sale,
        stocks_receiving,
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

      Counter.increment("stock_releasing_no").then((result) => {
        const items = [...body.items].map((item) => {
          const quantity = round(item.quantity);

          const amount = round(quantity * item.price);

          return {
            ...item,
            quantity,
            amount,
            total_quantity_received: 0,
          };
        });

        const newRecord = new StockReleasing({
          ...body,
          items,
          stock_releasing_no: result.next,
          logs,
        });
        newRecord
          .save()
          .then((record) => {
            update_inventory.updateItemsInCollection({
              record: stocks_receiving,
              ItemModel: StockReleasing,
              item_collection: "stock_release",
              items_column_key: "total_quantity_received",
              is_inc: false,
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

  let counter_promise;
  if (user?.department?._id) {
    counter_promise = CompanyCounter.increment(seq_key, user?.department?._id);
  } else {
    counter_promise = Counter.increment(seq_key);
  }

  counter_promise.then((result) => {
    const newRecord = new Model({
      ...body,
      department: user?.department,
      total_payment_amount: 0,
      [seq_key]: result.next,
      logs,
      status: {
        approval_status: OPEN,
        datetime,
        user,
      },
      created_by: user,
      updated_by: user,
    });
    newRecord
      .save()
      .then((record) => {
        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
});

router.post("/:id/print", async (req, res) => {
  console.log("here");
  await printing_functions.printReceivingReport({
    _id: req.params.id,
  });
  return res.json(true);
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
        ...(search_item_name && {
          "items.stock.name": {
            $regex: new RegExp(search_item_name, "i"),
          },
        }),
        ...(search_po_no && {
          po_no: parseInt(search_po_no),
        }),
      },
    },
    {
      $sort: {
        rr_no: 1,
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
        deleted: {
          $exists: false,
        },
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
        rr_no: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;
  let advance_search = req.body.advance_search || {};

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      $or: [
        {
          "supplier.name": {
            $regex: new RegExp(req.body.s, "i"),
          },
        },

        {
          invoice_no: req.body.s,
        },

        ...(validator.isNumeric(req.body.s)
          ? [
              {
                [seq_key]: parseInt(req.body.s),
              },
              {
                "purchase_order.po_no": parseInt(req.body.s),
              },
            ]
          : []),
      ],
    }),

    ...(advance_search.user_department?._id && {
      "department._id": ObjectId(advance_search.user_department._id),
    }),

    ...(advance_search.period_covered &&
      advance_search.period_covered[0] &&
      advance_search.period_covered[1] && {
        date: {
          $gte: moment(advance_search.period_covered[0])
            .startOf("day")
            .toDate(),
          $lte: moment(advance_search.period_covered[1]).endOf("day").toDate(),
        },
      }),

    ...(!isEmpty(advance_search.rr_no) && {
      rr_no: parseInt(advance_search.rr_no),
    }),

    ...(advance_search.warehouse && {
      "warehouse._id": ObjectId(advance_search.warehouse._id),
    }),

    ...(advance_search.approval_status && {
      "status.approval_status": advance_search.approval_status,
    }),

    ...(!isEmpty(advance_search.stock) && {
      "items.stock._id": ObjectId(advance_search.stock._id),
    }),
  };

  Model.paginate(form_data, {
    sort: {
      _id: -1,
    },
    page,
    limit: req.body?.page_size || 10,
  })
    .then(async (records) => {
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
        updated_by: user,
      });

      record
        .save()
        .then((record) => {
          if (record.purchase_order && record.purchase_order._id) {
            update_inventory
              .updateItemsInCollection({
                record: { ...old_record },
                ItemModel: PurchaseOrder,
                item_collection: "purchase_order",
                items_column_key: "received_quantity",
                items_column_case_key: "received_case_quantity",
                is_inc: false,
              })
              .then(() => {
                update_inventory
                  .updateItemsInCollection({
                    record: record.toObject(),
                    ItemModel: PurchaseOrder,
                    item_collection: "purchase_order",
                    items_column_key: "received_quantity",
                    items_column_case_key: "received_case_quantity",
                    is_inc: true,
                  })
                  .then(() => {
                    update_inventory.updatePoStatus(record.purchase_order);
                  });
              });
          }

          if (record.stock_transfer) {
            update_inventory
              .updateItemsInCollection({
                record: old_record,
                ItemModel: StockTransfer,
                item_collection: "stock_transfer",
                items_column_key: "total_received_quantity",
                items_column_case_key: "total_received_case_quantity",
                is_inc: false,
              })
              .then(() => {
                update_inventory.updateItemsInCollection({
                  record: record.toObject(),
                  ItemModel: StockTransfer,
                  item_collection: "stock_transfer",
                  items_column_key: "total_received_quantity",
                  items_column_case_key: "total_received_case_quantity",
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
        status: {
          approval_status: CANCELLED,
          datetime: moment().toDate(),
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
