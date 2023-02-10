const express = require("express");
const router = express.Router();
const CustomerCollection = require("./../../models/CustomerCollection");

const Customer = require("./../../models/Customer");
const Counter = require("./../../models/Counter");

const filterId = require("./../../utils/filterId");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/customer-collections");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const { default: validator } = require("validator");
const DeliveryReceipt = require("../../models/DeliveryReceipt");
const isEmpty = require("../../validators/is-empty");
const constants = require("../../config/constants");
const {
  updateDeliveriesFromCollection,
  updateDeliveryStatusFromPayment,
  updateCreditMemosFromCollection,
  updateCreditMemoStatusFromPayment,
} = require("../../library/update_functions");
const { OPEN, CANCELLED } = require("../../config/constants");
const CompanyCounter = require("../../models/CompanyCounter");
const { getCollectionReport } = require("../../library/report_functions");

const Model = CustomerCollection;

const seq_key = "collection_no";
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

  counter_promise = Counter.increment(seq_key);

  counter_promise.then((result) => {
    const newRecord = new Model({
      ...body,
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
        await updateDeliveriesFromCollection({
          delivery_items: record.delivery_items,
          is_inc: true,
        }).catch((err) => console.log(err));

        await updateDeliveryStatusFromPayment({
          _id: record._id,
        }).catch((err) => console.log(err));

        await updateCreditMemosFromCollection({
          credit_memo_items: record.credit_memo_items,
          is_inc: true,
        });

        await updateCreditMemoStatusFromPayment({
          _id: record._id,
        }).catch((err) => console.log(err));

        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
});

router.post("/:id/update-payment-status", async (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.user;
  const payment_status = req.body.payment_status;

  const _payment_status = {
    user,
    date: moment().toDate(),
    status: payment_status,
  };

  await Model.updateOne(
    {
      _id: ObjectId(req.params.id),
    },
    {
      $set: {
        payment_status: _payment_status,
      },
    }
  ).exec();

  return res.json(_payment_status);
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
          if (record.status?.approval_status === CANCELLED) {
            await updateDeliveriesFromCollection({
              delivery_items: record.delivery_items,
              is_inc: false,
            });

            await updateCreditMemosFromCollection({
              credit_memo_items: record.credit_memo_items,
              is_inc: false,
            });

            await updateDeliveryStatusFromPayment({
              _id: record._id,
            }).catch((err) => console.log(err));

            await updateCreditMemoStatusFromPayment({
              _id: record._id,
            }).catch((err) => console.log(err));
          }

          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.post("/customer-collection-report", async (req, res) => {
  const { period_covered, account, branch } = req.body;

  const records = await getCollectionReport({
    period_covered,
    account,
    branch,
  });

  return res.json(records);
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
  const { period_covered } = req.body;

  Model.aggregate([
    {
      $match: {
        "deleted.datetime": {
          $exists: false,
        },
        "status.approval_status": {
          $ne: CANCELLED,
        },
        date: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[1]).endOf("day").toDate(),
        },
        ...(req.body.customer?._id && {
          "customer._id": ObjectId(req.body.customer._id),
        }),
      },
    },
  ])
    .allowDiskUse(true)
    .then(async (records) => {
      let _records = await async.mapSeries([...records], async (record) => {
        const delivery_items = await async.mapSeries(
          [...record.delivery_items],
          async (item) => {
            const dr = await DeliveryReceipt.findOne({
              _id: ObjectId(item._id),
            });

            return {
              ...item,
              si_no: dr.si_no,
            };
          }
        );

        return {
          ...record,
          delivery_items,
        };
      });

      return res.json(_records);
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

    ...(!isEmpty(advance_search.dr_no) &&
      validator.isNumeric(advance_search.dr_no) && {
        "delivery_items.dr_no": parseInt(advance_search.dr_no),
      }),

    ...(!isEmpty(advance_search.cm_no) &&
      validator.isNumeric(advance_search.cm_no) && {
        "credit_memo_items.cm_no": parseInt(advance_search.cm_no),
      }),
    ...(!isEmpty(advance_search.collection_no) &&
      validator.isNumeric(advance_search.collection_no) && {
        collection_no: parseInt(advance_search.collection_no),
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

          await updateDeliveriesFromCollection({
            delivery_items: old_record.delivery_items,
            is_inc: false,
          });

          await updateDeliveriesFromCollection({
            delivery_items: record.delivery_items,
            is_inc: true,
          });

          updateDeliveryStatusFromPayment({
            _id: record._id,
          }).catch((err) => console.log(err));

          await updateCreditMemosFromCollection({
            credit_memo_items: old_record.credit_memo_items,
            is_inc: false,
          });

          await updateCreditMemosFromCollection({
            credit_memo_items: record.credit_memo_items,
            is_inc: true,
          });

          await updateDeliveryStatusFromPayment({
            _id: record._id,
          }).catch((err) => console.log(err));

          await updateCreditMemoStatusFromPayment({
            _id: record._id,
          }).catch((err) => console.log(err));

          /* updateCreditMemoFromCollection({
              credit_memo_items: old_record.credit_memo_items,
              is_inc: false,
            })
            .then(() => {
              update_inventory.updateCreditMemoFromCollection({
                credit_memo_items: record.credit_memo_items,
                is_inc: true,
              });
            }); */

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

      await updateDeliveriesFromCollection({
        delivery_items: record.delivery_items,
        is_inc: false,
      });

      await updateCreditMemosFromCollection({
        credit_memo_items: record.credit_memo_items,
        is_inc: false,
      });

      await updateDeliveryStatusFromPayment({
        _id: record._id,
      }).catch((err) => console.log(err));

      await updateCreditMemoStatusFromPayment({
        _id: record._id,
      }).catch((err) => console.log(err));

      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
