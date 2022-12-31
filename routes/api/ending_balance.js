const express = require("express");
const router = express.Router();
const EndingBalance = require("./../../models/EndingBalance");
const Counter = require("./../../models/Counter");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const mongoose = require("mongoose");
const validate = require("./../../validators/accounts");
const moment = require("moment-timezone");

const updateInventoryFromEndingBalance = require("./../../library/update_inventory")
  .updateInventoryFromEndingBalance;
const deductInventoryFromEndingBalance = require("./../../library/update_inventory")
  .deductInventoryFromEndingBalance;

const Model = EndingBalance;

router.get("/current", (req, res) => {
  const datetime = moment.tz(moment(), process.env.TIMEZONE);
  Model.findOne({
    date: {
      $gte: datetime
        .clone()
        .startOf("day")
        .toDate(),
      $lte: datetime
        .clone()
        .endOf("day")
        .toDate()
    },
    deleted: {
      $exists: false
    }
  }).then(ending_balance => res.json(ending_balance));
});

router.get("/summary", (req, res) => {
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

  Counter.increment("ending_balance")
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
        ending_balance_id: next,
        date: datetime,
        logs
      });

      newRecord
        .save()
        .then(record => {
          updateInventoryFromEndingBalance(record);
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
          deductInventoryFromEndingBalance(old_record)
            .then(() => {
              updateInventoryFromEndingBalance(record);
            })
            .catch(err => console.log(err));
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

  Model.findById(req.params.id).then(record => {
    record.deleted = {
      date: datetime,
      user: req.body.user,
      log: `${req.body.user.name} deleted Trans#${
        record.ending_balance_id
      } at ${moment(datetime).format("lll")}`
    };

    record
      .save()
      .then(record => {
        deductInventoryFromEndingBalance(record);
        return res.json(record);
      })
      .catch(err => console.log(err));
  });
});

module.exports = router;
