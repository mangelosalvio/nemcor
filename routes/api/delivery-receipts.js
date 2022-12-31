const express = require("express");
const router = express.Router();
const DeliveryReceipt = require("./../../models/DeliveryReceipt");
const SalesReturn = require("./../../models/SalesReturns");
const StockReleasing = require("./../../models/StockReleasing");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/delivery-receipts");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const StockTransfer = require("../../models/StockTransfer");
const PurchaseOrder = require("../../models/PurchaseOrder");
const printing_functions = require("../../utils/printing_functions");
const {
  CANCELLED,
  OPEN,
  CLOSED,
  DELIVERY_TYPE_COMPANY_DELIVERED,
  STATUS_PARTIAL,
  STATUS_FULL,
  STATUS_PAID,
} = require("../../config/constants");
const {
  createDeliveryReceiptFromSalesOrder,
} = require("../../library/update_functions");
const CreditMemo = require("../../models/CreditMemo");
const TankerWithdrawal = require("../../models/TankerWithdrawal");
const { uniqBy, orderBy, sumBy } = require("lodash");
const { getStatementOfAccount } = require("../../library/report_functions");

const Model = DeliveryReceipt;
const seq_key = "dr_no";
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
        .then(async (record) => {
          //create DR if not COMPANY DELIVERED
          if (
            record.delivery_type !== DELIVERY_TYPE_COMPANY_DELIVERED &&
            record.status?.approval_status === CLOSED
          ) {
            createDeliveryReceiptFromSalesOrder({
              _id: record._id,
            }).catch((err) => {
              console.log(err);
            });
          }

          //if status is closed and has total_payment_amount, update status

          if (
            record.status?.approval_status == CLOSED &&
            record.total_payment_amount > 0
          ) {
            let updated_status = STATUS_PARTIAL;

            if (record.total_payment_amount >= record.total_amount) {
              updated_status = STATUS_PAID;
            }

            record.status.approval_status = updated_status;
            record = await record.save();
          }

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

router.post("/customer-aging-details", async (req, res) => {
  const date = moment(req.body.date).endOf("day");
  let transactions = await update_inventory.getCustomerTransactionsAsOfDate(
    date,
    req.body.customer
  );

  // const dates = [[0], [1, 30], [31, 60], [61, 90], [90]];

  const dates = [[0], [1, 7], [8, 15], [16, 30], [31, 45], [46, 60], [60]];

  let arr = [];
  dates.forEach((aging_dates, index) => {
    if (index === 0) {
      //first
      const days = aging_dates[0];
      const aging_transactions = transactions.filter((o) => o.aging <= days);

      arr = [
        ...arr,
        {
          dates: aging_dates,
          aging_transactions,
        },
      ];
    } else if (index === dates.length - 1) {
      //last
      const days = aging_dates[0];
      const aging_transactions = transactions.filter((o) => o.aging > days);

      arr = [
        ...arr,
        {
          dates: aging_dates,
          aging_transactions,
        },
      ];
    } else {
      const starting_day = aging_dates[0];
      const ending_day = aging_dates[1];

      const aging_transactions = transactions.filter(
        (o) => o.aging >= starting_day && o.aging <= ending_day
      );

      arr = [
        ...arr,
        {
          dates: aging_dates,
          aging_transactions,
        },
      ];
    }
  });

  return res.json({
    aging: arr,
    total: sumBy(transactions, (o) => o.amount),
  });
});

router.post("/statement-of-account", async (req, res) => {
  const { date, customer } = req.body;

  const records = await getStatementOfAccount({ date, customer });
  let _records = records.map((record) => {
    const balance = record.items.reduce((acc, item) => {
      const _balance = round(
        item.total_amount - (item.total_payment_amount || 0)
      );

      return acc + _balance;
    }, 0);

    return {
      ...record,
      balance,
    };
  });

  return res.json(_records);
});

router.post("/customer-aging-summary", async (req, res) => {
  const date = moment(req.body.date).endOf("day");
  const transactions = await update_inventory.getCustomerTransactionsAsOfDate(
    date
  );

  let accounts = uniqBy(transactions, (o) => o.customer._id.toString());
  accounts = orderBy(accounts, (o) => o.customer.name).map((o) => o.customer);

  accounts = accounts.map((customer) => {
    const dates = [[0], [1, 7], [8, 15], [16, 30], [31, 45], [46, 60], [60]];
    // const dates = [[0], [1, 30], [31, 60], [61, 90], [90]];

    let arr = [];
    dates.forEach((aging_dates, index) => {
      if (index === 0) {
        //first
        const days = aging_dates[0];
        const aging_transactions = transactions.filter(
          (o) =>
            o.aging <= days &&
            o.customer._id.toString() === customer._id.toString()
        );

        const total = sumBy(aging_transactions, (o) => o.amount);

        arr = [...arr, total];
      } else if (index === dates.length - 1) {
        //last
        const days = aging_dates[0];
        const aging_transactions = transactions.filter(
          (o) =>
            o.aging > days &&
            o.customer._id.toString() === customer._id.toString()
        );
        const total = sumBy(aging_transactions, (o) => o.amount);

        arr = [...arr, total];
      } else {
        const starting_day = aging_dates[0];
        const ending_day = aging_dates[1];

        const aging_transactions = transactions.filter(
          (o) =>
            o.aging >= starting_day &&
            o.aging <= ending_day &&
            o.customer._id.toString() === customer._id.toString()
        );

        const total = sumBy(aging_transactions, (o) => o.amount);

        arr = [...arr, total];
      }
    });

    // let keys = ["Current", "1-30", "31-60", "61-90", ">90"];

    let keys = ["Current", "1-7", "8-15", "16-30", "31-45", "46-60", ">60"];

    keys.forEach((key, index) => {
      customer = {
        ...customer,
        [keys[index]]: arr[index],
      };
    });

    return {
      ...customer,
    };
  });

  accounts = accounts.map((o) => {
    return {
      ...o,
      total: round(
        o["Current"] +
          o["1-7"] +
          o["8-15"] +
          o["16-30"] +
          o["31-45"] +
          o["46-60"] +
          o[">60"]
      ),
    };
  });

  return res.json(accounts);
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

    ...(!isEmpty(advance_search.dr_no) && {
      dr_no: parseInt(advance_search.dr_no),
    }),

    ...(advance_search.customer && {
      "customer._id": ObjectId(advance_search.customer._id),
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

router.post("/customer-accounts", (req, res) => {
  const { customer, department } = req.body;

  async.parallel(
    {
      deliveries: (cb) =>
        DeliveryReceipt.aggregate([
          {
            $match: {
              deleted: {
                $exists: false,
              },
              "status.approval_status": {
                $ne: CANCELLED,
              },
              "customer._id": ObjectId(customer._id),
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
          {
            $sort: {
              date: 1,
            },
          },
        ])
          .allowDiskUse(true)
          .exec(cb),
      credit_memos: (cb) =>
        CreditMemo.aggregate([
          {
            $match: {
              deleted: {
                $exists: false,
              },
              "status.approval_status": {
                $ne: CANCELLED,
              },
              "customer._id": ObjectId(customer._id),
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
                    $ifNull: ["$total_credit_amount", 0],
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
          {
            $sort: {
              date: 1,
            },
          },
        ])
          .allowDiskUse(true)
          .exec(cb),
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

      delete body.__v;

      record.set({
        ...body,
        updated_by: user,
      });

      record
        .save()
        .then(async (record) => {
          //if tanker withdrawal is set, update the price of the items

          if (record.tanker_withdrawal?._id) {
            await async.eachSeries(record.items, async (item) => {
              const log = await TankerWithdrawal.updateOne(
                {
                  _id: ObjectId(record.tanker_withdrawal?._id),
                  "items.customer._id": ObjectId(record.customer._id),
                  "items.stock._id": ObjectId(item.stock._id),
                  "items.unit_of_measure._id": ObjectId(
                    item.unit_of_measure._id
                  ),
                  "items.quantity": item.quantity,
                },
                {
                  $set: {
                    "items.$[elem].price": item.price,
                    "items.$[elem].amount": item.amount,
                  },
                },
                {
                  arrayFilters: [
                    {
                      "elem.customer._id": ObjectId(record.customer._id),
                      "elem.stock._id": ObjectId(item.stock._id),
                      "elem.unit_of_measure._id": ObjectId(
                        item.unit_of_measure._id
                      ),
                      "elem.quantity": item.quantity,
                    },
                  ],
                }
              ).exec();

              return null;
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
