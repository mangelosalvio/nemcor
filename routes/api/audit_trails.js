const express = require("express");
const router = express.Router();
const AuditTrail = require("./../../models/AuditTrail");

const moment = require("moment");

router.post("/", (req, res) => {
  AuditTrail.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        date: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.delete("/:id", (req, res) => {
  const deleted = {
    user: req.body.user,
    datetime: moment.tz(moment(), process.env.TIMEZONE),
    reason: req.body.reason,
  };

  AuditTrail.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted,
      },
    },
    {
      new: true,
    }
  ).then((voided_record) => {
    return res.json({ id: req.params.id, user: req.body.user });
  });
});

module.exports = router;
