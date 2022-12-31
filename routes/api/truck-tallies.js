const express = require("express");
const router = express.Router();
const TruckTally = require("./../../models/TruckTally");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const update_inventory = require("./../../library/inventory");
const validateInput = require("./../../validators/truck-tallies");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const async = require("async");
const printing_functions = require("../../utils/printing_functions");
const report_functions = require("../../library/report_functions");
const {
  OPEN,
  OPENING_TIME,
  CANCELLED,
  UNBUNDLED,
  BUNDLED,
  CLOSED,
} = require("../../config/constants");
const { takeRight, uniq } = require("lodash");
const {
  loadTruckTally,
  assignDrNumberToTruckTally,
} = require("../../library/update_functions");
const Dispatch = require("../../models/Dispatch");
const { getBodegaWarehouse } = require("../../library/setting_functions");

const Model = TruckTally;
const seq_key = "truck_tally_no";
const ObjectId = mongoose.Types.ObjectId;

router.get("/print/delivery-report/:id", (req, res) => {
  Model.findOne({ _id: ObjectId(req.params.id) })
    .lean()
    .then(async (record) => {
      const items = await report_functions.getDeliveryReportFromTruckTally(
        req.params.id
      );

      return res.json({ ...record, items });
    })
    .catch((err) => console.log(err));
});

router.get("/print/:id", (req, res) => {
  Model.findOne({ _id: ObjectId(req.params.id) })
    .lean()
    .then(async (record) => {
      const items = await report_functions.getDeliveryReceiptFromTruckTally(
        req.params.id
      );

      return res.json({ ...record, items });
    })
    .catch((err) => console.log(err));
});

router.get("/:id/delete-item", async (req, res) => {
  const log = await Dispatch.updateOne(
    {
      "items._id": ObjectId(req.params.id),
    },
    {
      $set: {
        "items.$.loading_status": "For Loading",
      },
    }
  ).exec();

  return res.json(true);
});

router.get("/:id/print-bundles", async (req, res) => {
  await printing_functions.printBundles({ _id: req.params.id });
  return res.json(true);
});

router.get("/:id/print", async (req, res) => {
  await printing_functions.printDispatch({ _id: req.params.id });
  return res.json(true);
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

router.put("/mobile-load", (req, res) => {
  const datetime = moment.tz(moment(), process.env.TIMEZONE);
  const user = {
    name: "Mobile App",
  };
  if (req.body?._id) {
    //update
    TruckTally.findOneAndUpdate(
      {
        _id: ObjectId(req.body._id),
      },
      {
        $push: {
          items: {
            $each: req.body.items,
          },
        },
      },
      {
        new: true,
      }
    )
      .then((record) => {
        //customer_ids
        const customer_ids = uniq(req.body.items.map((o) => o.customer._id));
        async.eachSeries(customer_ids, async (customer_id) => {
          await printing_functions.printCustomerDeliveryReceipt({
            customer: {
              _id: customer_id,
            },
            truck_tally: {
              _id: record._id,
            },
          });
        });

        return res.json(record);
      })
      .catch((err) => res.status(401).json(err));
  } else {
    //save
    Counter.increment(seq_key).then(async (result) => {
      const warehouse = await getBodegaWarehouse();

      delete req.body._id;
      const newRecord = new TruckTally({
        ...req.body,
        date: moment().toDate(),
        warehouse,
        total_payment_amount: 0,
        [seq_key]: result.next,

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
          //customer_ids
          const customer_ids = uniq(req.body.items.map((o) => o.customer._id));
          async.eachSeries(customer_ids, async (customer_id) => {
            await printing_functions.printCustomerDeliveryReceipt({
              customer: {
                _id: customer_id,
              },
              truck_tally: {
                _id: record._id,
              },
            });
          });
          return res.json(record);
        })
        .catch((err) => console.log(err));
    });
  }
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

  Counter.increment(seq_key).then(async (result) => {
    const warehouse = await getBodegaWarehouse();
    const newRecord = new Model({
      ...body,
      warehouse,
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
        await loadTruckTally(record._id);

        return res.json(record);
      })
      .catch((err) => console.log(err));
  });
});

router.post("/:id/print-delivery-report-receipt", async (req, res) => {
  printing_functions.printDeliveryReportForReceipt({
    truck_tally: {
      _id: req.params.id,
    },
  });
  return res.json(true);
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
          if (record.status?.approval_status === CLOSED) {
            await assignDrNumberToTruckTally(record._id);
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

router.post("/print-customer-dr", async (req, res) => {
  await printing_functions.printCustomerDeliveryReceipt({
    ...req.body,
  });

  return res.json(true);
});

router.post("/bundle-item", async (req, res) => {
  const { _id, items } = req.body;

  const dispatch = await Model.findOneAndUpdate(
    {
      _id: ObjectId(_id),
    },
    {
      $set: {
        items,
      },
    },
    {
      new: true,
    }
  ).exec();

  //get dispatch
  const unbundled_items = (dispatch?.items || []).filter((o) =>
    isEmpty(o.bundle)
  ).length;

  let bundle_status = UNBUNDLED;
  if (unbundled_items <= 0) {
    bundle_status = BUNDLED;
  }

  await Model.updateOne(
    {
      _id: ObjectId(dispatch._id),
    },
    {
      $set: {
        bundle_status,
      },
    }
  ).exec();

  return res.json(true);
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

    ...(!isEmpty(advance_search.ds_no) && {
      ds_no: parseInt(advance_search.ds_no),
    }),

    ...(advance_search.customer && {
      "customer._id": ObjectId(advance_search.customer._id),
    }),

    ...(advance_search.approval_status && {
      "status.approval_status": advance_search.approval_status,
    }),
    ...(advance_search.bundle_status && {
      bundle_status: advance_search.bundle_status,
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

router.post("/delivery-receipt", async (req, res) => {
  const { truck_tally, customer } = req.body;

  const record = await report_functions.getCustomerTransactionFromTruckTally({
    truck_tally,
    customer,
  });

  return res.json(record);
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
          await loadTruckTally(record._id);

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
      await loadTruckTally(record._id, "For Loading");
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
