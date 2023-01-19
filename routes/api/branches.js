const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Branch = require("./../../models/Branch");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const validateInput = require("./../../validators/warehouses");
const moment = require("moment-timezone");
const Payroll = require("../../models/Payroll");
const Attendance = require("../../models/Attendance");
const Employee = require("../../models/Employee");

const Model = Branch;
const ObjectId = mongoose.Types.ObjectId;

router.get("/listings", (req, res) => {
  const string = (req.query.s || "")
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  Model.aggregate([
    {
      $addFields: {
        display_name: {
          $concat: ["$company.name", "-", "$name"],
        },
      },
    },
    {
      $match: {
        display_name: {
          $regex: new RegExp(string),
          $options: "i",
        },
      },
    },
    {
      $sort: {
        display_name: 1,
      },
    },
    {
      $limit: 20,
    },
  ])
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

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
    .sort({ name: 1 })
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
  const body = filterId(req);
  const user = req.body.user;

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
    ...body,
    logs,
  });
  newRecord
    .save()
    .then((record) => {
      return res.json(record);
    })
    .catch((err) => console.log(err));
});

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      name: {
        $regex: new RegExp(req.body.s, "i"),
      },
    }),
  };

  Model.paginate(form_data, {
    sort: {
      name: 1,
    },
    page,
    limit: 10,
  })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const filtered_body = filterId(req);
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    if (record) {
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

      const body = {
        ...filtered_body,
        logs,
      };

      delete body.__v;

      record.set({
        ...body,
      });

      record
        .save()
        .then(async (record) => {
          const _record = { ...record.toObject() };
          //update payrll
          await Payroll.updateMany(
            {
              "employee.branch._id": ObjectId(_record._id),
              "period_covered.0": {
                $gte: moment().subtract({ month: 1 }).startOf("day").toDate(),
              },
            },
            {
              $set: {
                "employee.branch": {
                  ..._record,
                },
              },
            }
          );

          //update payrll
          await Attendance.updateMany(
            {
              "employee.branch._id": ObjectId(_record._id),
              "period_covered.0": {
                $gte: moment().subtract({ month: 1 }).startOf("day").toDate(),
              },
            },
            {
              $set: {
                "employee.branch": {
                  ..._record,
                },
              },
            }
          );

          await Employee.updateMany(
            {
              "branch._id": ObjectId(_record._id),
            },
            {
              $set: {
                branch: {
                  ..._record,
                },
              },
            }
          );

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
