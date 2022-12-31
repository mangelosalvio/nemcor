const express = require("express");
const router = express.Router();
const Waiter = require("./../../models/Waiter");
const Counter = require("./../../models/Counter");

const isEmpty = require("./../../validators/is-empty");
const numberFormat = require("./../../utils/numberFormat");
const net = require("net");
const moment = require("moment-timezone");

const constants = require("./../../config/constants");
const escpos = require("./../../config/escpos");
const async = require("async");
const round = require("./../../utils/round");

const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

const validateInput = require("./../../validators/waiters");
const filterId = require("../../utils/filterId");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Model = Waiter;
const ObjectId = mongoose.Types.ObjectId;

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => {
      return res.json({
        ...record.toObject(),
        password: undefined,
      });
    })
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query.s)
    ? {}
    : {
        name: {
          $regex: new RegExp(req.query.s, "i"),
        },
      };

  Model.find(form_data)
    .sort({ name: 1 })
    .then((record) => {
      return res.json(record);
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
    name: req.body.name,
  }).then((record) => {
    if (record) {
      errors["name"] = "Name already exists";
      return res.status(401).json(errors);
    } else {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, async (err, hash) => {
          if (err) throw err;
          const newRecord = new Model({
            ...body,
            password: hash,
          });
          newRecord
            .save()
            .then((record) => {
              return res.json({ ...record.toObject(), password: undefined });
            })
            .catch((err) => console.log(err));
        });
      });
    }
  });
});

router.post("/auth", (req, res) => {
  Waiter.findOne({
    _id: ObjectId(req.body.waiter._id),
  }).then((record) => {
    bcrypt.compare(req.body.password, record.password).then((isMatch) => {
      if (isMatch) {
        return res.json(record);
      } else {
        return res.status(401).json({ password: "Password is invalid" });
      }
    });
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput.validateWaiterUpdate(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const body = filterId(req);

  Model.findById(req.params.id).then((record) => {
    if (record) {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, async (err, hash) => {
          if (err) throw err;

          record.set({
            ...body,
            ...(!isEmpty(req.body.password) && {
              password: hash,
            }),
          });
          record
            .save()
            .then((record) => {
              return res.json({ ...record.toObject(), password: undefined });
            })
            .catch((err) => console.log(err));
        });
      });
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
