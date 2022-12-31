const express = require("express");
const router = express.Router();
const CreditCard = require("./../../models/CreditCard");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const mongoose = require("mongoose");
const validate = require("./../../validators/accounts");
const moment = require("moment");
const Model = CreditCard;

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        name: {
          $regex: new RegExp("^" + req.query.s, "i"),
        },
      };

  Model.find(form_data)
    .sort({ name: 1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validate(req.body);
  const user = req.body.user;

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const form_data = filterId(req);

  Model.findOne({
    name: req.body.name,
  }).then((product) => {
    if (product) {
      errors["name"] = "Credit Card already exists";
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
        ...form_data,
        logs,
      });
      newRecord
        .save()
        .then((record) => res.json(record))
        .catch((err) => console.log(err));
    }
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validate(req.body);
  const user = req.body.user;

  if (!isValid) {
    return res.status(401).json(errors);
  }

  Model.findById(req.params.id).then((record) => {
    if (record) {
      const form_data = filterId(req);
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

      record.set({
        ...form_data,
        logs,
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
