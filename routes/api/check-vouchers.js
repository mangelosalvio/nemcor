const express = require("express");
const router = express.Router();
const CheckVoucher = require("./../../models/CheckVoucher");

const Customer = require("./../../models/Customer");
const Counter = require("./../../models/Counter");

const filterId = require("./../../utils/filterId");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/check-vouchers");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const { default: validator } = require("validator");
const DeliveryReceipt = require("../../models/DeliveryReceipt");
const isEmpty = require("../../validators/is-empty");
const constants = require("../../config/constants");
const {
  updatePurchaseOrderFromCheckVoucher,
  updatePurchaseOrderStatusFromCheckVoucher,
  updateDebitMemosFromCheckVoucher,
  updateDebitMemoStatusFromCheckVoucher,
} = require("../../library/update_functions");
const { OPEN, CANCELLED } = require("../../config/constants");
const CompanyCounter = require("../../models/CompanyCounter");

const Model = CheckVoucher;

const seq_key = "cv_no";
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
      [seq_key]: result.next,
      logs,
      status: {
        approval_status: OPEN,
        datetime,
        user,
      },
    });
    newRecord
      .save()
      .then(async (record) => {
        await updatePurchaseOrderFromCheckVoucher({
          purchase_order_items: record.purchase_order_items,
          is_inc: true,
        }).catch((err) => console.log(err));

        await updatePurchaseOrderStatusFromCheckVoucher({
          _id: record._id,
        }).catch((err) => console.log(err));

        await updateDebitMemosFromCheckVoucher({
          debit_memo_items: record.debit_memo_items,
          is_inc: true,
        });

        await updateDebitMemoStatusFromCheckVoucher({
          _id: record._id,
        }).catch((err) => console.log(err));

        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
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
router.post("/pending-checks", (req, res) => {
  const query = {
    deleted: {
      $exists: false,
    },
    check_status: {
      $exists: false,
    },
    payment_type: constants.PAYEMNT_TYPE_CHECK,
    ...(!isEmpty(req.body.customer) && {
      "customer._id": ObjectId(req.body.customer._id),
    }),
  };

  Model.find(query).then((records) => res.json(records));
});

router.post("/invoices", (req, res) => {
  const customer = req.body.customer;

  Invoice.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        "customer._id": ObjectId(customer._id),
      },
    },
    {
      $match: {
        $expr: {
          $ne: ["$total_payment_amount", "$net_amount"],
        },
      },
    },
    {
      $addFields: {
        balance: {
          $subtract: ["$net_amount", "$total_payment_amount"],
        },
      },
    },
  ])
    .then((records) => res.json(records))
    .catch((err) => res.status(401).json(err));
});

router.post("/unpaid-deliveries", (req, res) => {
  const customer = req.body.customer;

  DeliveryReceipt.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        "customer._id": ObjectId(customer._id),
      },
    },
    {
      $match: {
        $expr: {
          $lt: [{ $ifNull: ["$total_payment_amount", 0] }, "$total_amount"],
        },
      },
    },
    {
      $addFields: {
        balance: {
          $subtract: [
            "$total_amount",
            { $ifNull: ["$total_payment_amount", 0] },
          ],
        },
      },
    },
  ])
    .then((records) => res.json(records))
    .catch((err) => res.status(401).json(err));
});

router.post("/credit-memos", (req, res) => {
  const customer = req.body.customer;

  SalesReturn.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        "customer._id": ObjectId(customer._id),
      },
    },
    {
      $addFields: {
        balance: {
          $subtract: [
            "$total_amount",
            {
              $add: [
                "$total_debit_amount",
                {
                  $ifNull: ["$total_sales_debit_amount", 0],
                },
              ],
            },
          ],
        },
        debit_amount: {
          $subtract: [
            "$total_amount",
            {
              $add: [
                "$total_debit_amount",
                {
                  $ifNull: ["$total_sales_debit_amount", 0],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        $expr: {
          $gt: ["$balance", 0],
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
        ...(customer && {
          "customer._id": ObjectId(customer._id),
        }),
      },
    },
    {
      $unwind: {
        path: "$delivery_items",
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
      $group: {
        _id: "$customer._id",
        customer: {
          $first: "$customer",
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        "customer.name": 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/checks", (req, res) => {
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
        payment_type: constants.PAYEMNT_TYPE_CHECK,
        check_date: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[1]).endOf("day").toDate(),
        },
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
        [seq_key]: -1,
      },
    },
    {
      $group: {
        _id: "$customer._id",
        customer: {
          $first: "$customer",
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        "customer.name": 1,
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
    ...(!isEmpty(req.body.s) &&
      !validator.isNumeric(req.body.s) && {
        "customer.name": {
          $regex: new RegExp(req.body.s, "i"),
        },
      }),
    ...(!isEmpty(req.body.s) &&
      validator.isNumeric(req.body.s) && {
        collection_no: req.body.s,
      }),
    ...(advance_search.user_department?._id && {
      "department._id": ObjectId(advance_search.user_department._id),
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

      delete body.__v;

      record.set({
        ...body,
      });

      record
        .save()
        .then(async (record) => {
          //update customer opening balance payment

          await updatePurchaseOrderFromCheckVoucher({
            purchase_order_items: old_record.purchase_order_items,
            is_inc: false,
          });

          await updatePurchaseOrderFromCheckVoucher({
            purchase_order_items: record.purchase_order_items,
            is_inc: true,
          });

          await updatePurchaseOrderStatusFromCheckVoucher({
            _id: record._id,
          }).catch((err) => console.log(err));

          await updateDebitMemosFromCheckVoucher({
            debit_memo_items: old_record.debit_memo_items,
            is_inc: false,
          });

          await updateDebitMemosFromCheckVoucher({
            debit_memo_items: record.debit_memo_items,
            is_inc: true,
          });

          await updateDebitMemoStatusFromCheckVoucher({
            _id: record._id,
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
  Model.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted: {
          date: moment.tz(moment(), process.env.TIMEZONE),
          user: req.body.user,
        },
        "status.approval_status": CANCELLED,
      },
    },
    {
      new: true,
    }
  )
    .then(async (record) => {
      //update customer opening balance payment

      await updatePurchaseOrderFromCheckVoucher({
        purchase_order_items: record.purchase_order_items,
        is_inc: false,
      });

      await updateDebitMemoStatusFromCheckVoucher({
        debit_memo_items: record.debit_memo_items,
        is_inc: false,
      });

      await updatePurchaseOrderStatusFromCheckVoucher({
        _id: record._id,
      }).catch((err) => console.log(err));

      await updateDebitMemoStatusFromCheckVoucher({
        _id: record._id,
      }).catch((err) => console.log(err));

      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
