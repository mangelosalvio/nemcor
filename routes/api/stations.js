const express = require("express");
const router = express.Router();
const Station = require("./../../models/Station");
const Product = require("./../../models/Product");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");

const validateInput = require("./../../validators/stations");
const Category = require("../../models/Category");

const Model = Station;

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
          $regex: new RegExp(req.query.s, "i"),
        },
      };

  Model.find(form_data)
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

  Model.findOne({
    name: req.body.name,
  }).then((record) => {
    if (record) {
      errors["name"] = "Name already exists";
      return res.status(401).json(errors);
    } else {
      const form_data = filterId(req);
      const neRecord = new Model({
        ...form_data,
      });
      neRecord
        .save()
        .then((record) => res.json(record))
        .catch((err) => console.log(err));
    }
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  Model.findById(req.params.id).then((record) => {
    if (record) {
      const form_data = filterId(req);
      const station_name = form_data.name;

      record.set({
        ...form_data,
      });
      record
        .save()
        .then((record) => {
          /**
           * update stationnss of cateogory
           * */

          Category.updateMany(
            {
              "station.name": station_name,
            },
            {
              $set: {
                station: record.toObject(),
              },
            }
          ).exec();

          /**
           * update stations of the product
           */

          Product.updateMany(
            {
              "category.station.name": station_name,
            },
            {
              $set: {
                "category.station": record.toObject(),
              },
            }
          ).exec();

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
