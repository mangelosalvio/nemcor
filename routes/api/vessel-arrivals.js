const express = require("express");
const router = express.Router();
const VesselArrival = require("./../../models/VesselArrival");

const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/vessel-arrivals");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const validator = require("validator");

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
} = require("../../library/update_functions");
const PurchaseOrderCement = require("../../models/PurchaseOrderCement");
const CompanyCounter = require("../../models/CompanyCounter");

const Model = VesselArrival;
const seq_key = "vessel_arrival_no";
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
          display_name: `DOC#${record.vessel_arrival_no} - ${record.vessel?.name}`,
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
      department: user.department,
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
        //if with PO, update confirmed quantity at PO
        if (record.purchase_order?._id) {
          await async.eachSeries(record.items, async (o) => {
            PurchaseOrderCement.updateOne(
              {
                "items._id": ObjectId(o.po_detail_id),
              },
              {
                $inc: {
                  "items.$.confirmed_quantity": o.quantity,
                },
              }
            ).exec();

            return null;
          });
        }

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
        .then((record) => {
          //create DR if not COMPANY DELIVERED
          // if (
          //   record.delivery_type !== DELIVERY_TYPE_COMPANY_DELIVERED &&
          //   record.status?.approval_status === CLOSED
          // ) {
          //   createDeliveryReceiptFromSalesOrder({
          //     _id: record._id,
          //   }).catch((err) => {
          //     console.log(err);
          //   });
          // }

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
  const keyword = req.body.keyword;
  const tanker = req.body.tanker;
  const department = req.body.department;
  Model.aggregate([
    {
      $match: {
        "status.approval_status": {
          $ne: CANCELLED,
        },
        ...(!isEmpty(department?._id) && {
          "department._id": ObjectId(department._id),
        }),
        ...(!isEmpty(tanker?._id) && {
          "tanker._id": ObjectId(tanker._id),
        }),
        ...(validator.isNumeric(keyword)
          ? {
              ww_no: parseInt(keyword),
            }
          : {
              "supplier.name": {
                $regex: new RegExp(keyword, "i"),
              },
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
        const display_name = `${moment(o.date).format("MM/DD/YY")} ; WW#${
          o.ww_no
        } ; ${o.supplier?.name}`;

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

    ...(!isEmpty(advance_search.ww_no) && {
      ww_no: parseInt(advance_search.ww_no),
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
        .then(async (record) => {
          //if with PO, update confirmed quantity at PO
          if (old_record.purchase_order?._id) {
            await async.eachSeries(old_record.items, async (o) => {
              PurchaseOrderCement.updateOne(
                {
                  "items._id": ObjectId(o.po_detail_id),
                },
                {
                  $inc: {
                    "items.$.confirmed_quantity": 0 - o.quantity,
                  },
                }
              ).exec();

              return null;
            });
          }

          //if with PO, update confirmed quantity at PO
          if (record.purchase_order?._id) {
            await async.eachSeries(record.items, async (o) => {
              PurchaseOrderCement.updateOne(
                {
                  "items._id": ObjectId(o.po_detail_id),
                },
                {
                  $inc: {
                    "items.$.confirmed_quantity": o.quantity,
                  },
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
    .then(async (record) => {
      if (record.purchase_order?._id) {
        await async.eachSeries(record.items, async (o) => {
          PurchaseOrderCement.updateOne(
            {
              "items._id": ObjectId(o.po_detail_id),
            },
            {
              $inc: {
                "items.$.confirmed_quantity": 0 - o.quantity,
              },
            }
          ).exec();

          return null;
        });
      }

      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
