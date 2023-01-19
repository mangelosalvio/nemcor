const express = require("express");
const columnify = require("columnify");
const router = express.Router();
const Product = require("./../../models/Product");
const Sales = require("./../../models/Sales");
const Table = require("./../../models/Table");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const axios = require("axios");
const moment = require("moment-timezone");
const constants = require("./../../config/constants");
const validateProductInput = require("./../../validators/products");
const async = require("async");
const escpos = require("./../../config/escpos");
const net = require("net");
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const mongoose = require("mongoose");
const Tieup = require("../../models/Tieup");
const {
  MARKUP_OPTION_PERCENT_ADD_ON,
  MARKUP_OPTION_ADD_ON_VALUE,
} = require("./../../config/constants");
const round = require("../../utils/round");
const {
  udpateMeatTypesOfProductInSales,
} = require("../../library/sale_functions");
const { updateTransactionsOfItem } = require("../../library/update_functions");
const isEqual = require("lodash").isEqual;

const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;

const FILE_WIDTH = 40;

const ObjectId = mongoose.Types.ObjectId;
const Model = Product;

router.get("/listings", (req, res) => {
  const string = req.query.s
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  Model.aggregate([
    {
      $match: {
        $and: [
          {
            $or: [
              {
                disabled: {
                  $exists: false,
                },
              },
              {
                disabled: false,
              },
            ],
          },
          {
            $or: [
              {
                name: {
                  $regex: new RegExp(string),
                  $options: "i",
                },
              },
              {
                sku: {
                  $regex: new RegExp(string),
                  $options: "i",
                },
              },
            ],
          },
        ],
      },
    },
    {
      $addFields: {
        display_name: {
          $concat: ["$name"],
        },
      },
    },
    {
      $sort: {
        display_name: 1,
      },
    },
    {
      $limit: 20,
    },
  ])
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.get("/:id", (req, res) => {
  Product.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  let has_no_category = false;

  if (req.query.has_no_category) {
    has_no_category = req.query.has_no_category === "1" ? true : false;
  }

  const form_data = {
    $or: [
      {
        name: {
          $regex: new RegExp(req.query.s, "i"),
        },
      },
      {
        sku: {
          $regex: new RegExp(req.query.s, "i"),
        },
      },
    ],
    ...(has_no_category && {
      $or: [
        {
          "category.name": {
            $exists: false,
          },
        },
        {
          "category.main_category": {
            $exists: false,
          },
        },
        {
          "category.main_category": {
            $eq: "",
          },
        },
      ],
    }),
  };

  Product.find(form_data)
    .sort({ name: 1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validateProductInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }
  const body = filterId(req);

  Model.findOne({
    name: body.name,
  }).then(async (record) => {
    if (record) {
      errors["name"] = "Transaction already exists";
      return res.status(401).json(errors);
    } else {
      const newRecord = new Model({
        ...body,
      });
      newRecord
        .save()
        .then(async (record) => {
          return res.json(record);
        })
        .catch((err) => console.log(err));
    }
  });
});

router.post("/:id/branch-price", async (req, res) => {
  const branch = req.body.branch;
  const price = req.body.price;

  const count = await Product.countDocuments({
    _id: ObjectId(req.params.id),
    "branch_pricing.branch._id": ObjectId(branch._id),
  });

  // console.log(count);

  if (count <= 0) {
    await Product.updateOne(
      {
        _id: ObjectId(req.params.id),
      },
      {
        $push: {
          branch_pricing: {
            branch,
            price,
          },
        },
      }
    );
  } else {
    await Product.updateOne(
      {
        _id: ObjectId(req.params.id),
        "branch_pricing.branch._id": ObjectId(branch._id),
      },
      {
        $set: {
          "branch_pricing.$.price": price,
        },
      }
    );
  }

  const _product = await Product.findOne({
    _id: ObjectId(req.params.id),
  });

  return res.json(true);
});

router.post("/:id/branch-wholesale-price", async (req, res) => {
  const branch = req.body.branch;
  const price = req.body.price;

  const count = await Product.countDocuments({
    _id: ObjectId(req.params.id),
    "branch_pricing.branch._id": ObjectId(branch._id),
  });

  // console.log(count);

  if (count <= 0) {
    await Product.updateOne(
      {
        _id: ObjectId(req.params.id),
      },
      {
        $push: {
          branch_pricing: {
            branch,
            wholesale_price: price,
          },
        },
      }
    );
  } else {
    await Product.updateOne(
      {
        _id: ObjectId(req.params.id),
        "branch_pricing.branch._id": ObjectId(branch._id),
      },
      {
        $set: {
          "branch_pricing.$.wholesale_price": price,
        },
      }
    );
  }

  const _product = await Product.findOne({
    _id: ObjectId(req.params.id),
  });

  return res.json(true);
});

router.post("/:id/price", async (req, res) => {
  try {
    await Product.updateOne(
      {
        _id: ObjectId(req.params.id),
      },
      {
        $set: {
          [req.body.price_key]: req.body.price,
        },
      }
    ).exec();
    return res.json(true);
  } catch (err) {
    console.log(err);
    return res.status(401).json(err);
  }
});

router.post("/:id/tieup-price", async (req, res) => {
  const tieup = req.body.tieup;

  const product = Product.findOne({ _id: ObjectId(req.params.id) });

  if (isEmpty(tieup)) {
    return res.json({ price: product.price });
  }

  Product.aggregate([
    {
      $match: {
        _id: ObjectId(req.params.id),
      },
    },
    {
      $unwind: "$tieup_prices",
    },
    {
      $match: {
        "tieup_prices.tieup._id": ObjectId(tieup._id),
      },
    },
  ]).then((products) => {
    if (products.length > 0) {
      return res.json({ price: products[0].tieup_prices.price });
    } else {
      return res.json({ price: product.price });
    }
  });
});

router.post("/product-categories", (req, res) => {
  //in ids
  const product_categories = req.body.product_categories.map((o) =>
    ObjectId(o)
  );

  Product.find({
    "category._id": {
      $in: product_categories,
    },
  })
    .lean(true)
    .then((records) => {
      const _records = records.map((record) => {
        return {
          ...record,
          unit_of_measure:
            record.unit_of_measures.filter((o) => o.is_default)?.[0] || null,
        };
      });
      return res.json(_records);
    })
    .catch((err) => res.status(401).json(err));
});

router.post("/per-category", (req, res) => {
  const categories = req.body.categories || [];

  Product.aggregate([
    {
      $match: {
        ...(categories.length > 0 && {
          "category.name": {
            $in: categories,
          },
        }),
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
    {
      $group: {
        _id: "$category.name",
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
  ]).then((records) => res.json(records));
});

router.post("/sku", (req, res) => {
  Product.findOne({
    sku: {
      $regex: new RegExp(`^${req.body.sku}$`, "i"),
    },
  }).then((record) => res.json(record));
});

router.post("/name", (req, res) => {
  const name = req.body.name;
  const string = name
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  Model.aggregate([
    {
      $match: {
        $and: [
          {
            $or: [
              {
                disabled: {
                  $exists: false,
                },
              },
              {
                disabled: false,
              },
            ],
          },
          {
            $or: [
              {
                name: {
                  $regex: new RegExp(string),
                  $options: "i",
                },
              },
              {
                sku: {
                  $regex: new RegExp(string),
                  $options: "i",
                },
              },
            ],
          },
        ],
      },
    },
    {
      $addFields: {
        display_name: {
          $concat: [{ $ifNull: ["$sku", ""] }, "-", "$name"],
        },
      },
    },
    {
      $sort: {
        display_name: 1,
      },
    },
    {
      $limit: 50,
    },
  ])
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;
  let advance_search = req.body.advance_search || {};

  const form_data = {
    $or: [
      {
        sku: {
          $regex: new RegExp(req.body.s, "i"),
        },
      },
      {
        name: {
          $regex: new RegExp(req.body.s, "i"),
        },
      },
    ],
    ...(advance_search.category && {
      "category._id": ObjectId(advance_search.category._id),
    }),
  };

  Model.paginate(
    { ...form_data, "deleted.date": { $exists: false } },
    {
      sort: {
        name: 1,
      },
      page,
      limit: req.body?.page_size || 10,
    }
  )
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateProductInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const filtered_body = filterId(req);
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    if (record) {
      const body = {
        ...filtered_body,
      };

      record.set({
        ...body,
        updated_at: moment().toDate(),
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
  Model.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted: {
          date: moment.tz(moment(), process.env.TIMEZONE),
          user: req.body.user,
        },
      },
    },
    {
      new: true,
    }
  )
    .then(async (record) => {
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
