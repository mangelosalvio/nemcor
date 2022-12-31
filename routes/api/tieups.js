const express = require("express");
const router = express.Router();
const Tieup = require("./../../models/Tieup");
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

const validateInput = require("./../../validators/tieups");
const filterId = require("../../utils/filterId");
const { updateItemTieupPrice } = require("../../library/tieup_functions");
const ORDER_STATION_PRINTER_IP = process.env.ORDER_STATION_PRINTER_IP;
const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;

const Model = Tieup;

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
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
      errors["name"] = "Tieup already exists";
      return res.status(401).json(errors);
    } else {
      const newRecord = new Model({
        ...body,
      });
      newRecord
        .save()
        .then((record) => {
          updateItemTieupPrice({ tieup: record.toObject() });
          return res.json(record);
        })
        .catch((err) => console.log(err));
    }
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const body = filterId(req);

  Model.findById(req.params.id).then((record) => {
    if (record) {
      record.set({
        ...body,
      });
      record
        .save()
        .then((record) => {
          updateItemTieupPrice({ tieup: record.toObject() });

          return res.json(record);
        })
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
