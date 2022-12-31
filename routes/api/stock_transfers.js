const express = require("express");
const router = express.Router();
const StockTransfer = require("./../../models/StockTransfer");
const StockReleasing = require("./../../models/StockReleasing");
const StockReceiving = require("./../../models/StockReceiving");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/stock_transfers");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const round = require("../../utils/round");

const Model = StockTransfer;

const seq_key = "stock_transfer_no";
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

router.get("/approved", (req, res) => {
  const form_data = {
    status: {
      $exists: true,
    },
    deleted: {
      $exists: false,
    },
    date: {
      $gte: moment().startOf("week").toDate(),
      $lte: moment().endOf("week").toDate(),
    },
  };

  Model.find(form_data)
    .sort({ [seq_key]: -1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.get("/pending", (req, res) => {
  const form_data = {
    status: {
      $exists: false,
    },
    deleted: {
      $exists: false,
    },
  };

  Model.find(form_data)
    .sort({ [seq_key]: -1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
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
      const { date, to_warehouse, items, total_amount = 0 } = record.toObject();

      const body = {
        date,
        warehouse: to_warehouse,
        items,
        total_amount,
        stock_transfer: record,
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
            item.approved_quantity - item.total_received_quantity
          );
          const case_quantity = round(
            item.approved_case_quantity - item.total_received_case_quantity
          );

          return {
            ...item,
            quantity,
            case_quantity,
          };
        });

        const newRecord = new StockReceiving({
          ...body,
          rr_no: result.next,
          items,
          logs,
        });
        newRecord
          .save()
          .then((record) => {
            update_inventory.updateItemsInCollection({
              record: record.toObject(),
              ItemModel: StockTransfer,
              item_collection: "stock_transfer",
              items_column_key: "total_received_quantity",
              items_column_case_key: "total_received_case_quantity",
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

/**
 * generate stock releasing form
 */
router.put("/stock-releasing", (req, res) => {
  const user = req.body.user;
  Model.findOne({
    _id: ObjectId(req.body._id),
  })
    .then((record) => {
      const { date, from_warehouse, items, total_amount } = record.toObject();

      const body = {
        date,
        warehouse: from_warehouse,
        items,
        total_amount,
        stock_transfer: record.toObject(),
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
          const quantity = round(
            item.approved_quantity - item.total_released_quantity
          );
          const case_quantity = round(
            item.approved_case_quantity - item.total_released_case_quantity
          );

          return {
            ...item,
            quantity,
            case_quantity,
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
              record: record.toObject(),
              ItemModel: StockTransfer,
              item_collection: "stock_transfer",
              items_column_key: "total_released_quantity",
              items_column_case_key: "total_released_case_quantity",
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

router.post("/:id/update-status", (req, res) => {
  const user = req.body.user;

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

      const status = {
        approval_status: req.body.approval_status,
        datetime: datetime.clone().toDate(),
        user: req.body.user,
      };

      const body = {
        logs,
        status,
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
      "from_warehouse.name": {
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
