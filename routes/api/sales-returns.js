const express = require("express");
const router = express.Router();
const SalesReturn = require("./../../models/SalesReturn");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/sales-returns");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const printing_functions = require("../../utils/printing_functions");
const {
  CANCELLED,
  OPEN,
  ACTION_UPDATE,
  ACTION_SAVE,
  ACTION_CANCEL,
  MODULE_RETURN_STOCK,
  CLOSED,
  MODULE_CREDIT_MEMO,
} = require("../../config/constants");
const BranchCounter = require("../../models/BranchCounter");
const { saveTransactionAuditTrail } = require("../../library/update_functions");
const CreditMemo = require("../../models/CreditMemo");

const Model = SalesReturn;
const ObjectId = mongoose.Types.ObjectId;

const seq_key = "return_no";
const branch_reference_prefix = "RET";

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
  BranchCounter.increment(seq_key, branch._id).then((result) => {
    const branch_reference = `${branch_reference_prefix}-${
      branch?.company?.company_code
    }-${branch.name}-${result.next.toString().padStart(6, "0")}`;

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
        saveTransactionAuditTrail({
          user,
          module_name: MODULE_RETURN_STOCK,
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
        .then(async (record) => {
          if (record.status?.approval_status === CLOSED) {
            const result = await BranchCounter.increment(
              "cm_no",
              record.branch._id
            );
            const branch = record.branch;

            const branch_reference = `CM-${branch?.company?.company_code}-${
              branch.name
            }-${result.next.toString().padStart(6, "0")}`;

            //if for credit memo, create a credit memo
            const _record = await new CreditMemo({
              branch,
              cm_no: result.next,
              date: moment().toDate(),
              account: record.account,
              total_amount: record.total_amount,
              reason: record.return_stock_option,
              sales_return: {
                _id: record._id,
                return_no: record.return_no,
                date: record.date,
                branch_reference: record.branch_reference,
              },
              branch_reference,
              status: {
                approval_status: "Closed",
                datetime: moment().toDate(),
                user,
              },
              created_by: user,
            }).save();

            saveTransactionAuditTrail({
              user,
              module_name: MODULE_CREDIT_MEMO,
              reference: _record.cm_no,
              action: ACTION_SAVE,
            }).catch((err) => console.log(err));
          }

          saveTransactionAuditTrail({
            user,
            module_name: MODULE_RETURN_STOCK,
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

    ...(!isEmpty(advance_search.rr_no) && {
      rr_no: parseInt(advance_search.rr_no),
    }),

    ...(advance_search.supplier && {
      "supplier._id": ObjectId(advance_search.supplier._id),
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
          saveTransactionAuditTrail({
            user,
            module_name: MODULE_RETURN_STOCK,
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
      saveTransactionAuditTrail({
        user,
        module_name: MODULE_RETURN_STOCK,
        reference: record[seq_key],
        action: ACTION_CANCEL,
      }).catch((err) => console.log(err));
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
