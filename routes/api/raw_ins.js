const express = require("express");
const router = express.Router();
const RawIn = require("./../../models/RawIn");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const mongoose = require("mongoose");
const validate = require("./../../validators/accounts");
const Model = RawIn;
const moment = require("moment-timezone");
const updateInventoryFromStocksReceiving = require("./../../library/update_inventory")
  .updateInventoryFromStocksReceiving;
const deductInventoryFromStocksReceiving = require("./../../library/update_inventory")
  .deductInventoryFromStocksReceiving;

router.get("/:id/balance", (req, res) => {
  Model.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.params.id)
      }
    },
    {
      $unwind: "$ledger"
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $subtract: ["$ledger.credit", "$ledger.debit"]
          }
        }
      }
    }
  ]).then(records => res.json(records[0]));
});

router.get("/summary", (req, res) => {
  const startDate = new moment().startOf("day").toDate();
  const endDate = new moment().endOf("day").toDate();
  Model.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $unwind: "$raw_materials"
    },
    {
      $group: {
        _id: "$raw_materials.raw_material.name",
        name: {
          $first: "$raw_materials.raw_material.name"
        },
        quantity: {
          $sum: "$raw_materials.raw_material_quantity"
        }
      }
    }
  ]).then(result => res.json(result));
});

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then(record => res.json(record))
    .catch(err => console.log(err));
});

router.get("/", (req, res) => {
  let form_data = {
    deleted: {
      $exists: false
    }
  };

  Model.find(form_data)
    .sort({ _id: -1 })
    .then(records => {
      return res.json(records);
    })
    .catch(err => console.log(err));
});

router.put("/", (req, res) => {
  const form_data = filterId(req);

  Counter.increment("raw_ins")
    .then(({ next }) => {
      const user = req.body.user;
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Added by ${user.name} on ${datetime.format("LLL")}`;

      const logs = [
        {
          user,
          datetime,
          log
        }
      ];

      const newRecord = new Model({
        ...form_data,
        raw_in_id: next,
        date: datetime,
        logs
      });

      newRecord
        .save()
        .then(record => {
          updateInventoryFromStocksReceiving(record);
          return res.json(record);
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
});

router.post("/:id", (req, res) => {
  Model.findById(req.params.id).then(record => {
    const old_record = { ...record.toObject() };
    if (record) {
      const form_data = filterId(req);

      record.set({
        ...form_data
      });
      record
        .save()
        .then(record => {
          deductInventoryFromStocksReceiving(old_record).then(() => {
            updateInventoryFromStocksReceiving(record);
          });
          return res.json(record);
        })
        .catch(err => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  const datetime = moment.tz(moment(), process.env.TIMEZONE);

  RawIn.findById(req.params.id).then(raw_in => {
    raw_in.deleted = {
      date: datetime,
      user: req.body.user,
      log: `${req.body.user.name} deleted Trans#${raw_in.raw_in_id} at ${moment(
        datetime
      ).format("lll")}`
    };

    raw_in
      .save()
      .then(raw_in => {
        deductInventoryFromStocksReceiving(raw_in);
        return res.json(raw_in);
      })
      .catch(err => console.log(err));
  });
});

module.exports = router;
