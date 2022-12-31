const express = require("express");
const router = express.Router();
const GiftCheck = require("./../../models/GiftCheck");
const isEmpty = require("./../../validators/is-empty");
const validate = require("./../../validators/gift_checks");
const filterId = require("./../../utils/filterId");
const mongoose = require("mongoose");
const validator = require("validator");
const Model = GiftCheck;
const moment = require("moment-timezone");

router.get("/:gift_check_number/status", (req, res) => {
  const form_data = [
    {
      $match: {
        "items.gift_check_number": req.params.gift_check_number,
      },
    },
    {
      $unwind: "$items",
    },
    {
      $match: {
        "items.gift_check_number": req.params.gift_check_number,
        /* "items.date_of_expiry": {
          $gte: moment.tz(moment(), process.env.TIMEZONE).toDate(),
        }, */
        "items.used": {
          $exists: false,
        },
      },
    },
  ];

  Model.aggregate(form_data)
    .then((gift_checks) => {
      if (gift_checks.length > 0) {
        /**
         * update gift check to used
         */

        const gift_check = gift_checks[0];

        GiftCheck.update(
          {
            "items._id": gift_check.items._id,
          },
          {
            "items.$.used": {
              datetime: moment.tz(moment(), process.env.TIMEZONE),
            },
          },
          {
            multi: false,
          }
        ).exec();

        return res.json(gift_check);
      } else {
        return res.status(401).json({ error: "Not found" });
      }
    })
    .catch((err) => console.log(err));
});

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const s = req.query.s;

  Model.find({
    ...(!isEmpty(s) && {
      "items.gift_check_number": s,
    }),
  })
    .sort({ _id: -1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/", (req, res) => {
  const user = req.body.user;
  const { isValid, errors } = validate(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const form_data = filterId(req);
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
    ...form_data,
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    logs,
  });
  newRecord
    .save()
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.post("/unuse", (req, res) => {
  GiftCheck.update(
    {
      "items._id": req.body.gift_check_id,
    },
    {
      $unset: {
        "items.$.used": "",
      },
    },
    {
      multi: false,
    }
  ).then(() => {
    return res.json({ success: 1 });
  });
});

router.post("/:gift_check_number/use", (req, res) => {
  const form_data = [
    {
      $match: {
        "items.gift_check_number": req.params.gift_check_number,
      },
    },
    {
      $unwind: "$items",
    },
    {
      $match: {
        "items.gift_check_number": req.params.gift_check_number,
        /* "items.date_of_expiry": {
          $gte: moment.tz(moment(), process.env.TIMEZONE).toDate(),
        }, */
        "items.used": {
          $exists: false,
        },
      },
    },
  ];

  Model.aggregate(form_data)
    .then((gift_checks) => {
      if (gift_checks.length > 0) {
        /**
         * update gift check to used
         */

        const gift_check = gift_checks[0];

        GiftCheck.update(
          {
            "items._id": gift_check.items._id,
          },
          {
            "items.$.used": {
              table: req.body.table,
              datetime: moment.tz(moment(), process.env.TIMEZONE),
            },
          },
          {
            multi: false,
          }
        ).exec();

        return res.json(gift_check);
      } else {
        return res.status(401).json({ error: "Not found" });
      }
    })
    .catch((err) => console.log(err));
});

router.post("/:id", (req, res) => {
  Model.findById(req.params.id).then((record) => {
    if (record) {
      const form_data = filterId(req);

      record.set({
        ...form_data,
      });
      record
        .save()
        .then((record) => res.json(record))
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  Model.findByIdAndRemove(req.params.id)
    .then((response) => res.json({ success: 1 }))
    .catch((err) => console.log(err));
});

module.exports = router;
