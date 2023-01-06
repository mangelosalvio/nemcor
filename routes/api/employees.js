const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Employee = require("./../../models/Employee");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const validateInput = require("./../../validators/employees");
const moment = require("moment-timezone");
const { CANCELLED } = require("../../config/constants");
const constants = require("../../config/constants");

const Model = Employee;
const ObjectId = mongoose.Types.ObjectId;

router.get("/listings", (req, res) => {
  const string = req.query.s
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  Model.aggregate([
    {
      $match: {
        name: {
          $regex: new RegExp(string),
          $options: "i",
        },
      },
    },
    {
      $addFields: {
        display_name: {
          $concat: ["$name"],
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

  Model.findOne({
    name: body.name,
  }).then((record) => {
    if (record) {
      errors["name"] = "Transaction already exists";
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
        ...body,
        logs,
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

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;
  let advance_search = req.body.advance_search || {};

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      name: {
        $regex: new RegExp(req.body.s, "i"),
      },
    }),
  };

  Model.paginate(
    {
      ...form_data,
      ...(advance_search.branch?._id && {
        "branch._id": ObjectId(advance_search.branch?._id),
      }),
      "status.approval_status": {
        $ne: constants.CANCELLED,
      },
    },
    {
      sort: {
        name: 1,
      },
      page,
      limit: 10,
    }
  )
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});
router.post("/:id/contribution", async (req, res) => {
  const applicable_contributions = [
    "weekly_sss_contribution",
    "weekly_philhealth_contribution",
    "weekly_hdmf_contribution",
  ];
  const { contribution, amount } = req.body;

  if (!applicable_contributions.includes(contribution)) {
    return res.status(401).json({ msg: "Contribution not found" });
  }

  await Employee.updateOne(
    {
      _id: ObjectId(req.params.id),
    },
    {
      $set: {
        [contribution]: amount,
      },
    }
  );

  return res.json(true);
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
  Model.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted: {
          date: moment.tz(moment(), process.env.TIMEZONE),
          user: req.body.user,
        },
        status: {
          approval_status: CANCELLED,
          datetime: moment().toDate(),
          user: req.body.user,
        },
      },
    },
    {
      new: true,
    }
  )
    .then((record) => {
      return res.json({ success: 1 });
    })
    .catch((err) => console.log(err));
});

module.exports = router;
