const express = require("express");
const router = express.Router();
const MeatType = require("./../../models/MeatType");

const isEmpty = require("./../../validators/is-empty");
const validateInput = require("./../../validators/meat-types");
const filterId = require("../../utils/filterId");

const Model = MeatType;

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
      errors["name"] = "Name already exists";
      return res.status(401).json(errors);
    } else {
      const newRecord = new Model({
        ...body,
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
