const express = require("express");
const router = express.Router();
const TankerWithdrawal = require("./../../models/TankerWithdrawal");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/tanker-withdrawals");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const validator = require("validator");
const async = require("async");
const StockTransfer = require("../../models/StockTransfer");
const PurchaseOrder = require("../../models/PurchaseOrder");
const printing_functions = require("../../utils/printing_functions");
const { CANCELLED, OPEN, CLOSED } = require("../../config/constants");
const {
  updateSalesOrderFromTankerWithdrawals,
  updateSalesOrdersStatusOnConfirmedQuantity,
  createDeliveryReceiptFromTankerWithdrawal,
  updateSupplierWithdrawalsFromTankerWithdrawals,
  updateSalesOrderStatusBasedOnWithdrawals,
} = require("../../library/update_functions");
const DeliveryReceipt = require("../../models/DeliveryReceipt");
const { uniqBy, takeRight } = require("lodash");
const SalesOrder = require("../../models/SalesOrder");
const CompanyCounter = require("../../models/CompanyCounter");

const Model = TankerWithdrawal;
const seq_key = "tw_no";
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
              is_per_unit_dr: record.is_per_unit_dr || false,
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

router.post("/list", (req, res) => {
  const keyword = req.body.value;
  const tanker = req.body.tanker;
  const department = req.body.department;
  Model.aggregate([
    {
      $match: {
        ...(validator.isNumeric(keyword) && {
          tw_no: parseInt(keyword),
        }),
        ...(!isEmpty(tanker?._id) && {
          "tanker._id": ObjectId(tanker._id),
        }),
        ...(!isEmpty(department?._id) && {
          "department._id": ObjectId(department._id),
        }),
      },
    },
    {
      $sort: {
        _id: -1,
      },
    },
    {
      $limit: 50,
    },
  ])
    .allowDiskUse(true)
    .then((records) => {
      const _records = records.map((o) => {
        const display_name = `${moment(o.date).format("MM/DD/YY")} ; TS#${
          o.tw_no
        } ; ${o.tanker?.plate_no}`;

        return {
          ...o,
          display_name,
        };
      });

      return res.json(_records);
    })
    .catch((err) => res.status(401).json(err));
});

router.post("/history", (req, res) => {
  const { period_covered } = req.body;

  Model.aggregate([
    {
      $match: {
        "status.approval_status": {
          $ne: CANCELLED,
        },
        date: {
          $gte: moment(period_covered[0]).startOf("day").toDate(),
          $lte: moment(period_covered[1]).endOf("day").toDate(),
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
    .then(async (records) => {
      let _records = await async.mapSeries([...records], async (record) => {
        let items = await async.mapSeries([...record.items], async (item) => {
          const sales_order = await SalesOrder.findOne({
            _id: Object(item.so_id),
          }).lean(true);

          const delivery_area = sales_order?.delivery_area?.name || "";

          const delivery_receipts = await DeliveryReceipt.aggregate([
            {
              $match: {
                "deleted.datetime": {
                  $exists: false,
                },
                "customer._id": ObjectId(item.customer?._id),
                ...(item?.unit?._id && {
                  "unit._id": ObjectId(item?.unit?._id),
                }),
                "tanker_withdrawal._id": ObjectId(record._id),
                items: {
                  $elemMatch: {
                    "stock._id": ObjectId(item.stock._id),
                    quantity: item.quantity,
                    price: item.price,
                  },
                },
              },
            },
            {
              $project: {
                dr_no: 1,
                external_dr_ref: 1,
                si_no: 1,
              },
            },
          ]);

          return {
            ...item,
            delivery_area,
            delivery_receipts,
          };
        });

        return {
          ...record,
          items,
        };
      });
      return res.json(_records);
    })
    .catch((err) => res.status(401).json(err));
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

    ...(!isEmpty(advance_search.tw_no) && {
      tw_no: parseInt(advance_search.tw_no),
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

router.post("/:id/update-source", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    const old_record = { ...record.toObject() };
    if (record) {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Modified by ${user.name} on ${datetime.format("LLL")}`;

      const logs = takeRight(
        [
          ...record.logs,
          {
            user,
            datetime,
            log,
          },
        ],
        5
      );

      const {
        source_withdrawal,
        source_depot_items,
        source_tankers,
        warehouse,
      } = filtered_body;
      const body = {
        source_withdrawal,
        source_depot_items,
        source_tankers,
        warehouse,
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
          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
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

          //for old
          const so_ids = uniqBy(old_record.items.map((o) => o.so_id));

          await async.eachSeries(so_ids, async (o) => {
            updateSalesOrderStatusBasedOnWithdrawals(o);
            return null;
          });

          //for new
          await updateSalesOrdersStatusOnConfirmedQuantity({
            _id: record._id,
          }).catch((err) => console.log(err));

          await updateSupplierWithdrawalsFromTankerWithdrawals({
            items: old_record.source_tankers,
            is_inc: false,
          }).catch((err) => console.log(err));

          await updateSupplierWithdrawalsFromTankerWithdrawals({
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
      updateSalesOrderFromTankerWithdrawals({
        items: record.items,
        is_inc: false,
      }).catch((err) => console.log(err));

      updateSalesOrdersStatusOnConfirmedQuantity({
        _id: record._id,
      }).catch((err) => console.log(err));

      updateSupplierWithdrawalsFromTankerWithdrawals({
        items: record.source_tankers,
        is_inc: false,
      }).catch((err) => console.log(err));

      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
