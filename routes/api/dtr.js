const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");
const Dtr = require("./../../models/Dtr");

router.get("/", (req, res) => res.json({ msg: "DTR Works" }));

router.post("/", (req, res) => {
  //find a dtr if available
  Dtr.findOne({
    id_no: req.body.id_no,
    date: moment
      .tz(process.env.TIMEZONE)
      .startOf("day")
      .valueOf()
  })
    .then(dtr => {
      if (dtr) {
        dtr[req.body.option] = moment.tz(process.env.TIMEZONE).valueOf();
        dtr
          .save()
          .then(updatedDtr => res.send(updatedDtr))
          .catch(err => console.log(err));
      } else {
        const dtr = new Dtr({
          id_no: req.body.id_no,
          date: moment
            .tz(process.env.TIMEZONE)
            .startOf("day")
            .valueOf()
        });

        dtr[req.body.option] = moment.tz(process.env.TIMEZONE).valueOf();

        dtr
          .save()
          .then(dtr => res.json(dtr))
          .catch(err => console.log(err));
      }
    })
    .catch(err => console.log(err));
});

router.post("/summary", (req, res) => {
  Dtr.find({
    id_no: req.body.id_no,
    date: {
      $gte: req.body.startDate,
      $lte: req.body.endDate
    }
  })
    .then(dtrs => res.json(dtrs))
    .catch(err => console.log(err));
});

module.exports = router;
