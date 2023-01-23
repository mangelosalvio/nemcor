const express = require("express");
const router = express.Router();
const PurchaseOrderCement = require("./../../models/PurchaseOrderCement");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/purchase_orders");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const printing_functions = require("../../utils/printing_functions");
const {
  CANCELLED,
  OPEN,
  CLOSED,
  DELIVERY_TYPE_COMPANY_DELIVERED,
  STATUS_PARTIAL,
} = require("../../config/constants");
const {
  createDeliveryReceiptFromSalesOrder,
  updateSuppliersWithdrawalPriceFromPurchaseOrderCement,
} = require("../../library/update_functions");
const DebitMemo = require("../../models/DebitMemo");
const CompanyCounter = require("../../models/CompanyCounter");

const Model = PurchaseOrderCement;
const seq_key = "po_cement_no";
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
  const department_id = req.query.department_id;

  const form_data = isEmpty(req.query)
    ? {}
    : {
        $or: [
          {
            [seq_key]: parseInt(req.query.s),
          },
        ],
      };

  Model.find({
    ...form_data,
    ...(!isEmpty(department_id) && {
      "department._id": ObjectId(department_id),
    }),
  })
    .sort({ [seq_key]: 1 })
    .limit(100)
    .lean(true)
    .then((records) => {
      const _records = records.map((record) => {
        return {
          ...record,
          po_no: record.po_cement_no,
          display_name: `PO#${record.po_cement_no} - ${record.supplier?.name}`,
        };
      });

      return res.json(_records);
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

router.post("/:po_no/po-no", (req, res) => {
  const { department } = req.body;
  PurchaseOrderCement.findOne({
    po_cement_no: parseInt(req.params.po_no),
    ...(department?._id && {
      "department._id": ObjectId(department._id),
    }),
  })
    .then((record) => {
      return res.json(record);
    })
    .catch((err) => res.status(401).json(err));
});

router.post("/:id/print", async (req, res) => {
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
          //create DR if not COMPANY DELIVERED

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

router.post("/supplier-accounts", (req, res) => {
  const { supplier, department } = req.body;

  async.parallel(
    {
      purchase_orders: (cb) =>
        PurchaseOrder.aggregate([
          {
            $match: {
              "deleted.date": {
                $exists: false,
              },
              "status.approval_status": {
                $ne: CANCELLED,
              },
              "supplier._id": ObjectId(supplier._id),
              ...(department?._id && {
                "department._id": ObjectId(department._id),
              }),
            },
          },
          {
            $addFields: {
              total_amount: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: {
                    $add: ["$$this.amount", "$$value"],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              balance: {
                $subtract: [
                  "$total_amount",
                  {
                    $ifNull: ["$total_payment_amount", 0],
                  },
                ],
              },
            },
          },
          {
            $match: {
              balance: {
                $ne: 0,
              },
            },
          },
        ]).exec(cb),
      debit_memos: (cb) =>
        DebitMemo.aggregate([
          {
            $match: {
              deleted: {
                $exists: false,
              },
              "status.approval_status": {
                $ne: CANCELLED,
              },
              "supplier._id": ObjectId(supplier._id),
              ...(department?._id && {
                "department._id": ObjectId(company._id),
              }),
            },
          },
          {
            $addFields: {
              total_amount: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: {
                    $add: ["$$this.amount", "$$value"],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              balance: {
                $subtract: [
                  "$total_amount",
                  {
                    $ifNull: ["$total_debit_amount", 0],
                  },
                ],
              },
            },
          },
          {
            $match: {
              balance: {
                $ne: 0,
              },
            },
          },
        ]).exec(cb),
    },

    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(401).json(err);
      }

      return res.json(results);
    }
  );
});

router.post("/for-bundling", (req, res) => {
  const { period_covered } = req.body;

  if (isEmpty(period_covered?.[0]) || isEmpty(period_covered?.[1])) {
    return res.status(401).json({
      period_covered: "Period covered required",
    });
  }

  Model.aggregate([
    {
      $match: {
        date_needed: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[0]).endOf("day").toDate(),
        },
        "status.approval_status": {
          $in: [OPEN, CLOSED, STATUS_PARTIAL],
        },
        delivery_type: DELIVERY_TYPE_COMPANY_DELIVERED,
      },
    },
    {
      $unwind: "$items",
    },
    {
      $project: {
        _id: 1,
        so_no: 1,
        so_id: "$_id",
        so_item_id: "$items._id",
        customer: 1,
        stock: "$items.stock",
        unit_of_measure: "$items.unit_of_measure",
        quantity: "$items.quantity",
        price: "$items.price",
        balance: {
          $subtract: [
            "$items.quantity",
            {
              $ifNull: ["$items.confirmed_quantity", 0],
            },
          ],
        },
      },
    },
  ])
    .then((records) => res.json(records))
    .catch((err) => res.status(401).json(err));
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

    ...(!isEmpty(advance_search.po_cement_no) && {
      po_cement_no: parseInt(advance_search.po_cement_no),
    }),

    ...(advance_search.supplier && {
      "supplier._id": ObjectId(advance_search.supplier._id),
    }),

    ...(advance_search.user_department?._id && {
      "department._id": ObjectId(advance_search.user_department._id),
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

      delete filtered_body.__v;
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
        .then(async (record) => {
          //update suppliers withdrawal with a given PO and update PRICE AND FREIGHT and recompute totals
          // await updateSuppliersWithdrawalPriceFromPurchaseOrder(record._id);

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
