const express = require("express");
const router = express.Router();
const WarehouseReturn = require("./../../models/WarehouseReturn");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/warehouse-returns");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");

const printing_functions = require("../../utils/printing_functions");
const { CANCELLED, OPEN, CLOSED } = require("../../config/constants");
const {
  updateSalesOrderFromTankerWithdrawals,
  updateSalesOrdersStatusOnConfirmedQuantity,
  createDeliveryReceiptFromTankerWithdrawal,
  updateSupplierWithdrawalsFromTankerWithdrawals,
} = require("../../library/update_functions");
const DeliveryReceipt = require("../../models/DeliveryReceipt");

const Model = WarehouseReturn;
const seq_key = "wr_no";
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
      .then(async (record) => {
        await updateSalesOrderFromTankerWithdrawals({
          items: record.items,
          is_inc: true,
        }).catch((err) => console.log(err));

        await updateSalesOrdersStatusOnConfirmedQuantity({
          _id: record._id,
        }).catch((err) => console.log(err));

        await updateSupplierWithdrawalsFromTankerWithdrawals({
          items: record.source_tankers,
          is_inc: true,
        }).catch((err) => console.log(err));

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

  //if approval status is closed, and source withdrawal is from supplier, check if there is an input of supplier withdrawals

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
            createDeliveryReceiptFromTankerWithdrawal({
              _id: record._id,
            }).catch((err) => {
              console.log(err);
            });
          }

          if (record?.status?.approval_status === CANCELLED) {
            //if cancelled, cancel all DRs connected to tanker withdrawal
            await DeliveryReceipt.updateMany(
              {
                "tanker_withdrawal._id": ObjectId(record._id),
              },
              {
                $set: {
                  "status.approval_status": CANCELLED,
                },
              }
            ).exec();

            //if cancelled, deduct quantity to Sales Orders
            await updateSalesOrderFromTankerWithdrawals({
              items: record.items,
              is_inc: false,
            }).catch((err) => console.log(err));

            await updateSupplierWithdrawalsFromTankerWithdrawals({
              items: record.source_tankers,
              is_inc: false,
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

    ...(advance_search.approval_status && {
      "status.approval_status": advance_search.approval_status,
    }),

    ...(!isEmpty(advance_search.stock) && {
      "items.stock._id": ObjectId(advance_search.stock._id),
    }),

    ...(advance_search.user_department?._id && {
      "department._id": ObjectId(advance_search.user_department._id),
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

      delete body.__v;
      delete body.tw_no;

      record.set({
        ...body,
        updated_by: user,
      });

      record
        .save()
        .then(async (record) => {
          await updateSalesOrderFromTankerWithdrawals({
            items: old_record.items,
            is_inc: false,
          }).catch((err) => console.log(err));

          await updateSalesOrderFromTankerWithdrawals({
            items: record.items,
            is_inc: true,
          }).catch((err) => console.log(err));

          updateSalesOrdersStatusOnConfirmedQuantity({
            _id: record._id,
          }).catch((err) => console.log(err));

          updateSupplierWithdrawalsFromTankerWithdrawals({
            items: old_record.source_tankers,
            is_inc: false,
          }).catch((err) => console.log(err));

          updateSupplierWithdrawalsFromTankerWithdrawals({
            items: record.source_tankers,
            is_inc: true,
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
