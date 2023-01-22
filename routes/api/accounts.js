const express = require("express");
const columnify = require("columnify");
const router = express.Router();
const Account = require("./../../models/Account");

const AccountSetting = require("./../../models/AccountSetting");
const BranchInventory = require("./../../models/BranchInventory");
const Table = require("./../../models/Table");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const axios = require("axios");
const moment = require("moment-timezone");
const constants = require("./../../config/constants");
const validateInput = require("./../../validators/accounts");
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
const Model = Account;

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
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  let has_no_category = false;
  const account_type = req.query.account_type;

  // console.log(req.query.account_type);

  const form_data = {
    $or: [
      {
        name: {
          $regex: new RegExp(req.query.s, "i"),
        },
      },
    ],
    ...(account_type && {
      account_type: {
        $in: account_type,
      },
    }),
  };

  Account.find(form_data)
    .sort({ name: 1 })
    .lean(true)
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

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

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;
  let advance_search = req.body.advance_search || {};

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      account: {
        $regex: new RegExp(req.body.s, "i"),
      },
    }),
    ...(advance_search.account_type && {
      account_type: advance_search.account_type,
    }),
  };

  Model.paginate(form_data, {
    sort: {
      account: 1,
    },
    page,
    limit: req.body?.page_size || 10,
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
    .then((record) => {
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
