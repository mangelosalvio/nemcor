const express = require("express");
const router = express.Router();
const Inventory = require("./../../models/Inventory");
const RawIn = require("./../../models/RawIn");
const BegBalance = require("./../../models/BegBalance");
const Product = require("./../../models/Product");
const EndBalance = require("./../../models/EndingBalance");
const Table = require("./../../models/Table");
const Sales = require("./../../models/Sales");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const moment = require("moment-timezone");
const round = require("./../../utils/round");
const numberFormat = require("./../../utils/numberFormat");
const report_functions = require("./../../library/report_functions");
const numeral = require("numeral");
const mongoose = require("mongoose");
const async = require("async");
const net = require("net");
const getDate = require("./../../utils/getDate");
const SalesOtherSet = require("../../models/SalesOtherSet");

const Model = Inventory;

router.get("get-date", (req, res) => {
  return getDate();
});

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {
        deleted: {
          $exists: false,
        },
      }
    : {
        "branch.name": {
          $regex: new RegExp(req.query.s, "i"),
        },
        deleted: {
          $exists: false,
        },
      };

  Model.find(form_data)
    .populate("category")
    .sort({ name: 1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/entry", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.user;

  const datetime = moment.tz(moment(), process.env.TIMEZONE);
  const log = `Modified by ${user.name} on ${datetime.format("LLL")}`;

  Model.update(
    {
      date: {
        $gte: moment.tz(moment(), process.env.TIMEZONE).startOf("day").toDate(),
        $lte: moment.tz(moment(), process.env.TIMEZONE).endOf("day").toDate(),
      },
      "product._id": filtered_body.product._id,
    },
    {
      $set: {
        date: datetime,
        product: filtered_body.product,
        beg_bal: filtered_body.beg_bal,
        product_ins: filtered_body.in,
        orders: filtered_body.orders,
        sales: filtered_body.sales,
        end_bal: filtered_body.end_bal,
        computed_bal: filtered_body.computed_bal,
        variance: filtered_body.variance,
        log: {
          user,
          datetime,
          log,
        },
      },
    },
    {
      upsert: true,
    }
  ).exec();
  return res.json({ success: 1 });
});

router.put("/", (req, res) => {
  const body = filterId(req);
  const user = req.body.user;

  Model.findOne({
    date: {
      $gte: moment(body.date).startOf("day"),
      $lte: moment(body.date).endOf("day"),
    },
    "branch._id": body.branch._id,
    deleted: {
      $exists: false,
    },
  }).then((record) => {
    if (record) {
      errors["date"] = "Transaction already exists";
      return res.status(401).json(errors);
    } else {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Added by ${user.name} on ${datetime.format("LLL")}`;

      const logs = [
        {
          user,
          datetime,
          log,
        },
      ];

      const newRecord = new Model({
        ...body,
        logs,
      });
      newRecord
        .save()
        .then((record) => {
          return res.json(record);
        })
        .catch((err) => console.log(err));
    }
  });
});

router.post("/entry", (req, res) => {
  Inventory.findOne({
    date: {
      $gte: moment.tz(moment(), process.env.TIMEZONE).startOf("day").toDate(),
      $lte: moment.tz(moment(), process.env.TIMEZONE).endOf("day").toDate(),
    },
    deleted: {
      $exists: false,
    },
  }).then((inventory) => {
    return res.json(inventory);
  });
});

router.post("/current-entry", (req, res) => {
  const now = moment.tz(moment(), process.env.TIMEZONE);
  async.parallel(
    {
      items: (cb) => {
        Product.find({
          "category._id": req.body.category._id,
        })
          .sort({
            name: 1,
          })
          .exec(cb);
      },
      entries: (cb) => {
        Inventory.find({
          date: {
            $gte: moment
              .tz(moment(), process.env.TIMEZONE)
              .startOf("day")
              .toDate(),
            $lte: moment
              .tz(moment(), process.env.TIMEZONE)
              .endOf("day")
              .toDate(),
          },
        }).exec(cb);
      },
    },
    (err, result) => {
      if (err) {
        console.log(err);
        return;
      }

      return res.json(result);
    }
  );
});

router.post("/current", (req, res) => {
  Inventory.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        date: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
      },
    },
    {
      $project: {
        date: 1,
        product: "$product",
        category: "$product.category",
        beg_bal: 1,
        product_ins: 1,
        orders: 1,
        sales: 1,
        end_bal: 1,
        computed_bal: 1,
        variance: 1,
      },
    },
    {
      $sort: {
        "product.name": 1,
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dayOfYear: "$date",
          },
          category: "$category._id",
        },
        category: {
          $first: "$category",
        },
        date: {
          $first: "$date",
        },
        items: {
          $push: {
            product: "$product",
            beg_bal: "$beg_bal",
            product_ins: "$product_ins",
            orders: "$orders",
            sales: "$sales",
            end_bal: "$end_bal",
            computed_bal: "$computed_bal",
            variance: "$variance",
          },
        },
      },
    },
    {
      $sort: {
        date: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/raw-materials-current", async (req, res) => {
  const date_covered = moment(req.body.date_covered);

  const inventory = await getRawMaterialInventory(date_covered);
  return res.json(inventory);
});

getRawMaterialInventory = (date_covered) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        raw_materials: (cb) => {
          Product.aggregate([
            {
              $match: {
                "raw_materials.0": {
                  $exists: true,
                },
              },
            },
            {
              $unwind: {
                path: "$raw_materials",
              },
            },
            {
              $project: {
                _id: "$raw_materials.raw_material._id",
                name: "$raw_materials.raw_material.name",
              },
            },
            {
              $group: {
                _id: {
                  _id: "$_id",
                  name: "$name",
                },
              },
            },
            {
              $sort: {
                "_id.name": 1,
              },
            },
            {
              $project: {
                _id: "$_id._id",
                name: "$_id.name",
              },
            },
          ]).exec(cb);
        },
        sales: (cb) => {
          Sales.aggregate([
            {
              $match: {
                datetime: {
                  $gte: date_covered.clone().startOf("day").toDate(),
                  $lte: date_covered.clone().endOf("day").toDate(),
                },
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: {
                path: "$orders",
              },
            },
            {
              $unwind: {
                path: "$orders.items",
              },
            },
            {
              $match: {
                "orders.items.product.raw_materials.0": {
                  $exists: true,
                },
              },
            },
            {
              $project: {
                product: "$orders.items.product",
                item_quantity: "$orders.items.quantity",
              },
            },
            {
              $unwind: {
                path: "$product.raw_materials",
              },
            },
            {
              $project: {
                raw_material_id: "$product.raw_materials.raw_material._id",
                raw_material_name: "$product.raw_materials.raw_material.name",
                raw_material_quantity:
                  "$product.raw_materials.raw_material_quantity",
                item_quantity: "$item_quantity",
                rm_used: {
                  $multiply: [
                    "$product.raw_materials.raw_material_quantity",
                    "$item_quantity",
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  _id: "$raw_material_id",
                  name: "$raw_material_name",
                },
                rm_used: {
                  $sum: "$rm_used",
                },
              },
            },
            {
              $project: {
                _id: "$_id._id",
                name: "$_id.name",
                rm_used: "$rm_used",
              },
            },
          ]).exec(cb);
        },
        orders: (cb) => {
          Table.aggregate([
            {
              $unwind: {
                path: "$orders",
              },
            },
            {
              $unwind: {
                path: "$orders.items",
              },
            },
            {
              $match: {
                "orders.items.product.raw_materials.0": {
                  $exists: true,
                },
              },
            },
            {
              $unwind: {
                path: "$orders.items.product.raw_materials",
              },
            },
            {
              $project: {
                raw_material:
                  "$orders.items.product.raw_materials.raw_material",
                item_quantity: "$orders.items.quantity",
                rm_quantity:
                  "$orders.items.product.raw_materials.raw_material_quantity",
              },
            },
            {
              $project: {
                raw_material: 1,
                item_quantity: 1,
                rm_quantity: 1,
                rm_used: {
                  $multiply: ["$item_quantity", "$rm_quantity"],
                },
              },
            },
            {
              $group: {
                _id: {
                  _id: "$raw_material._id",
                  name: "$raw_material.name",
                },
                rm_used: {
                  $sum: "$rm_used",
                },
              },
            },
            {
              $project: {
                _id: "$_id._id",
                name: "$_id.name",
                rm_used: 1,
              },
            },
          ]).exec(cb);
        },
        beg_balances: (cb) => {
          BegBalance.aggregate([
            {
              $match: {
                date: {
                  $gte: date_covered.clone().startOf("day").toDate(),
                  $lte: date_covered.clone().endOf("day").toDate(),
                },
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: {
                path: "$raw_materials",
              },
            },
            {
              $project: {
                _id: "$raw_materials.raw_material._id",
                name: "$raw_materials.raw_material.name",
                rm_quantity: "$raw_materials.raw_material_quantity",
              },
            },
          ]).exec(cb);
        },
        raw_ins: (cb) => {
          RawIn.aggregate([
            {
              $match: {
                date: {
                  $gte: date_covered.clone().startOf("day").toDate(),
                  $lte: date_covered.clone().endOf("day").toDate(),
                },
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: {
                path: "$raw_materials",
              },
            },
            {
              $project: {
                _id: "$raw_materials.raw_material._id",
                name: "$raw_materials.raw_material.name",
                rm_quantity: "$raw_materials.raw_material_quantity",
              },
            },
          ]).exec(cb);
        },
        end_balances: (cb) => {
          EndBalance.aggregate([
            {
              $match: {
                date: {
                  $gte: date_covered.clone().startOf("day").toDate(),
                  $lte: date_covered.clone().endOf("day").toDate(),
                },
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: {
                path: "$raw_materials",
              },
            },
            {
              $project: {
                _id: "$raw_materials.raw_material._id",
                name: "$raw_materials.raw_material.name",
                rm_quantity: "$raw_materials.raw_material_quantity",
              },
            },
          ]).exec(cb);
        },
      },
      (err, result) => {
        if (err) {
          reject(err);
        }

        let raw_materials = [...result.raw_materials];

        let rm_result = raw_materials.map((raw_material) => {
          //find raw material in orders

          let beg_balances = [...result.beg_balances];
          let raw_ins = [...result.raw_ins];
          let end_balances = [...result.end_balances];

          let orders = [...result.orders];
          let sales = [...result.sales];

          let rm_order = orders.find((o) => o._id === raw_material._id);
          rm_order = rm_order ? rm_order.rm_used : 0;

          let rm_sales = sales.find((o) => o._id === raw_material._id);
          rm_sales = rm_sales ? rm_sales.rm_used : 0;

          let rm_beg_balance = beg_balances.find(
            (o) => o._id === raw_material._id
          );
          rm_beg_balance = rm_beg_balance ? rm_beg_balance.rm_quantity : 0;

          let rm_in = raw_ins.find((o) => o._id === raw_material._id);
          rm_in = rm_in ? rm_in.rm_quantity : 0;

          let end_bal = end_balances.find((o) => o._id === raw_material._id);
          end_bal = end_bal ? end_bal.rm_quantity : 0;

          /**
           * date is not today, then orders should be 0
           */

          const is_today = moment
            .tz(moment(), process.env.TIMEZONE)
            .startOf("day")
            .isSame(date_covered.clone().startOf("day"));

          if (!is_today) {
            rm_order = 0;
          }

          const computed_end_bal = numeral(0);

          computed_end_bal.add(rm_beg_balance);
          computed_end_bal.add(rm_in);
          computed_end_bal.subtract(rm_order);
          computed_end_bal.subtract(rm_sales);

          const variance = end_bal - computed_end_bal.value();

          return {
            ...raw_material,
            beg_bal: rm_beg_balance,
            raw_in: rm_in,
            orders: rm_order,
            sales: rm_sales,
            computed_end_bal: computed_end_bal.value(),
            end_bal: end_bal,
            variance,
          };
        });

        resolve(rm_result);
      }
    );
  });
};

router.post("/inventory-balance-report", (req, res) => {
  Inventory.aggregate([
    {
      $sort: {
        "product.name": 1,
      },
    },
    {
      $group: {
        _id: {
          category: "$product.category._id",
        },

        category: {
          $first: "$product.category",
        },

        items: {
          $push: {
            product: "$product",
            balance: "$balance",
          },
        },
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/sales-inventory", async (req, res) => {
  const {
    from_datetime,
    to_datetime,
  } = await report_functions.getPeriodFromRequest({
    from_date: req.body.period_covered[0],
    to_date: req.body.period_covered[1],
  });

  const other_set = req.body.other_set || false;
  let SalesModel = Sales;

  if (other_set) {
    SalesModel = SalesOtherSet;
  }

  SalesModel.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $unwind: {
        path: "$items",
      },
    },
    {
      $sort: {
        "items.product.name": 1,
      },
    },
    {
      $project: {
        datetime: "$datetime",
        day_of_year: {
          $dayOfYear: {
            date: "$datetime",
            timezone: process.env.TIMEZONE,
          },
        },
        product: "$items.product",
        category: "$items.product.category",
        quantity: {
          $toInt: "$items.quantity",
        },
      },
    },
    {
      $group: {
        _id: {
          date: "$day_of_year",
          product: "$product._id",
          category: "$category._id",
        },
        day_of_year: {
          $first: "$day_of_year",
        },
        datetime: {
          $first: "$datetime",
        },
        product: {
          $first: "$product",
        },
        category: {
          $first: "$category",
        },
        quantity: {
          $sum: "$quantity",
        },
      },
    },
    {
      $sort: {
        day_of_year: 1,
        quantity: -1,
      },
    },
    {
      $group: {
        _id: {
          date: "$day_of_year",
          category: "$category._id",
        },
        day_of_year: {
          $first: "$day_of_year",
        },
        datetime: {
          $first: "$datetime",
        },
        category: {
          $first: "$category",
        },
        items: {
          $push: {
            product: "$product",
            quantity: "$quantity",
          },
        },
      },
    },
    {
      $sort: {
        day_of_year: 1,
        "category.name": 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/sales-per-meat-type", async (req, res) => {
  const {
    from_datetime,
    to_datetime,
  } = await report_functions.getPeriodFromRequest({
    from_date: req.body.period_covered[0],
    to_date: req.body.period_covered[1],
  });

  const other_set = req.body.other_set || false;
  let SalesModel = Sales;

  if (other_set) {
    SalesModel = SalesOtherSet;
  }

  SalesModel.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $unwind: {
        path: "$items",
      },
    },
    {
      $unwind: {
        path: "$items.product.meat_types",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $replaceRoot: {
        newRoot: "$items",
      },
    },
    {
      $addFields: {
        "product.meat_types": {
          $ifNull: ["$product.meat_types", "**Not Defined**"],
        },
      },
    },
    {
      $group: {
        _id: {
          _id: "$product._id",
          meat_types: "$product.meat_types",
        },
        product: {
          $first: "$product",
        },
        meat_type: {
          $first: "$product.meat_types",
        },
        quantity: {
          $sum: "$quantity",
        },
      },
    },
    {
      $sort: {
        "product.name": 1,
      },
    },
    {
      $group: {
        _id: "$_id.meat_types",
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/current-branch", (req, res) => {
  const branch_id = req.body.user.branch._id;
  Model.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        date: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
        "branch._id": mongoose.Types.ObjectId(branch_id),
      },
    },
    {
      $project: {
        branch: 1,
        date: 1,
        product: "$product",
        category: {
          $arrayElemAt: ["$product.category", -1],
        },
        beg_bal: 1,
        deliveries: 1,
        production: 1,
        transmittals: 1,
        sales: 1,
        disc_sales: 1,
        pull_out: 1,
        end_bal: 1,
        computed_bal: 1,
        variance: 1,
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dayOfYear: "$date",
          },
          branch: "$branch",
          category: "$category",
        },
        branch: {
          $first: "$branch",
        },
        date: {
          $first: "$date",
        },
        items: {
          $push: {
            product: "$product",
            beg_bal: "$beg_bal",
            deliveries: "$deliveries",
            production: "$production",
            transmittals: "$transmittals",
            sales: "$sales",
            disc_sales: "$disc_sales",
            pull_out: "$pull_out",
            end_bal: "$end_bal",
            computed_bal: "$computed_bal",
            variance: "$variance",
          },
        },
      },
    },
    {
      $project: {
        date: 1,
        branch: 1,
        category: {
          category: "$_id.category",
          items: "$items",
        },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category.category",
        foreignField: "_id",
        as: "category.category",
      },
    },
    {
      $project: {
        branch: 1,
        date: 1,
        logs: 1,
        category: {
          category: {
            $arrayElemAt: ["$category.category", 0],
          },
          items: "$category.items",
        },
      },
    },
    {
      $project: {
        branch: 1,
        date: 1,
        logs: 1,
        category: {
          category: {
            _id: "$category.category._id",
            name: "$category.category.name",
          },
          items: "$category.items",
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        branch: {
          $first: "$branch",
        },
        date: {
          $first: "$date",
        },
        logs: {
          $first: "$logs",
        },
        categories: {
          $push: "$category",
        },
      },
    },
    {
      $sort: {
        date: 1,
        "branch.name": 1,
        "categories.items.product.name": 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/:id", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.user;

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

      record.set({
        ...body,
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

router.delete("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => {
      const user = req.body.user;
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Deleted by ${user.name} on ${datetime.format("LLL")}`;
      record.set({
        deleted: {
          log,
          user: req.body.user,
          datetime,
        },
      });
      record.save().then((record) => res.json({ success: 1 }));
    })
    .catch((err) => console.log(err));
});

module.exports = router;
