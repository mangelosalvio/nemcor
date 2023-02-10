const express = require("express");
const router = express.Router();
const DeliveryReceipt = require("./../../models/DeliveryReceipt");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/delivery-receipts");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const printing_functions = require("../../utils/printing_functions");
const {
  CANCELLED,
  OPEN,
  MODULE_WAREHOUSE_RECEIPT,
  ACTION_UPDATE,
  ACTION_SAVE,
  ACTION_CANCEL,
  PAYMENT_TYPE_CASH,
  PAYMENT_TYPE_CHARGE,
  STATUS_PAID,
} = require("../../config/constants");
const BranchCounter = require("../../models/BranchCounter");
const { saveTransactionAuditTrail } = require("../../library/update_functions");
const BranchTransactionCounter = require("../../models/BranchTransactionCounter");
const CreditMemo = require("../../models/CreditMemo");
const {
  getStatementOfAccount,
  getSalesReport,
} = require("../../library/report_functions");

const Model = DeliveryReceipt;
const ObjectId = mongoose.Types.ObjectId;

const seq_key = "dr_no";
const branch_reference_prefix = "DR";

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

  const branch = req.body.branch;
  BranchTransactionCounter.increment(
    seq_key,
    branch._id,
    req.body.payment_type
  ).then((result) => {
    let branch_reference;
    if (req.body.payment_type === PAYMENT_TYPE_CASH) {
      branch_reference = `SI-${branch?.company?.company_code}-${
        branch.name
      }-${result.next.toString().padStart(6, "0")}`;
    } else {
      branch_reference = `CSI-${branch?.company?.company_code}-${
        branch.name
      }-${result.next.toString().padStart(6, "0")}`;
    }

    const newRecord = new Model({
      ...body,
      branch_reference,
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
        const module_name =
          record.payment_type === PAYMENT_TYPE_CASH
            ? "Cash Sales Invoice"
            : "Charge Sales Invoice";
        saveTransactionAuditTrail({
          user,
          module_name,
          reference: record[seq_key],
          action: ACTION_SAVE,
        }).catch((err) => console.log(err));

        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
});

/**
 * for raw printing
 */
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
          const module_name =
            record.payment_type === PAYMENT_TYPE_CASH
              ? "Cash Sales Invoice"
              : "Charge Sales Invoice";
          saveTransactionAuditTrail({
            user,
            module_name,
            reference: record[seq_key],
            action: record.status?.approval_status,
          }).catch((err) => console.log(err));

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

router.post("/statement-of-account", async (req, res) => {
  const { period_covered, account, branch } = req.body;

  const records = await getStatementOfAccount({
    period_covered,
    account,
    branch,
  });
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

router.post("/cash-sales-report", async (req, res) => {
  const { period_covered, account, branch } = req.body;

  const records = await getSalesReport({
    period_covered,
    account,
    branch,
    payment_type: PAYMENT_TYPE_CASH,
  });

  return res.json(records);
});

router.post("/charge-sales-report", async (req, res) => {
  const { period_covered, account, branch } = req.body;

  const records = await getSalesReport({
    period_covered,
    account,
    branch,
    payment_type: PAYMENT_TYPE_CHARGE,
  });

  return res.json(records);
});

router.post("/customer-accounts", (req, res) => {
  const { account, branch } = req.body;

  console.log(branch?._id);

  async.parallel(
    {
      deliveries: (cb) =>
        DeliveryReceipt.aggregate([
          {
            $match: {
              ...(branch?._id && {
                "branch._id": ObjectId(branch._id),
              }),
              payment_type: PAYMENT_TYPE_CHARGE,
              "status.approval_status": {
                $nin: [CANCELLED, STATUS_PAID],
              },
              "account._id": ObjectId(account._id),
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
                $round: [
                  {
                    $subtract: [
                      "$total_amount",
                      {
                        $ifNull: ["$total_payment_amount", 0],
                      },
                    ],
                  },
                  2,
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
              "status.approval_status": {
                $nin: [CANCELLED, STATUS_PAID],
              },
              "account._id": ObjectId(account._id),
              ...(branch?._id && {
                "branch._id": ObjectId(branch._id),
              }),
            },
          },
          {
            $addFields: {
              balance: {
                $round: [
                  {
                    $subtract: [
                      "$total_amount",
                      {
                        $ifNull: ["$total_credit_amount", 0],
                      },
                    ],
                  },
                  2,
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

    ...(!isEmpty(advance_search.dr_no) && {
      dr_no: parseInt(advance_search.dr_no),
    }),

    ...(advance_search.supplier && {
      "supplier._id": ObjectId(advance_search.supplier._id),
    }),

    ...(advance_search.payment_type && {
      payment_type: advance_search.payment_type,
    }),

    ...(advance_search.branch && {
      "branch._id": ObjectId(advance_search.branch._id),
    }),
    ...(advance_search.account && {
      "account._id": ObjectId(advance_search.account._id),
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
      [seq_key]: -1,
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
          const module_name =
            record.payment_type === PAYMENT_TYPE_CASH
              ? "Cash Sales Invoice"
              : "Charge Sales Invoice";
          saveTransactionAuditTrail({
            user,
            module_name,
            reference: record[seq_key],
            action: ACTION_UPDATE,
          }).catch((err) => console.log(err));

          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  const user = req.body.user;
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
      const module_name =
        record.payment_type === PAYMENT_TYPE_CASH
          ? "Cash Sales Invoice"
          : "Charge Sales Invoice";
      saveTransactionAuditTrail({
        user,
        module_name,
        reference: record[seq_key],
        action: ACTION_CANCEL,
      }).catch((err) => console.log(err));
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
