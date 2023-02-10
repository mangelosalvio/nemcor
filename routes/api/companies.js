const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const mkdirp = require("mkdirp");
const router = express.Router();
const Company = require("./../../models/Company");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const validateInput = require("./../../validators/companies");
const moment = require("moment-timezone");
const fs = require("fs");
const Branch = require("../../models/Branch");
const Payroll = require("../../models/Payroll");
const Attendance = require("../../models/Attendance");
const DeliveryReceipt = require("../../models/DeliveryReceipt");

const Model = Company;
const ObjectId = mongoose.Types.ObjectId;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "static/images";
    mkdirp(dir).then((made) => cb(null, dir));
  },
  filename: (req, file, cb) => {
    const fileFormat = file.originalname.split(".");
    const ext = fileFormat[fileFormat.length - 1];
    cb(null, file.fieldname + "-" + Date.now() + "." + ext);
  },
});

const upload = multer({ storage: storage });

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

router.post("/listings", (req, res) => {
  const string = req.body.value
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  Model.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
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

router.post("/:id/delete-image", (req, res) => {
  fs.unlink(`${req.body.image.path}`, async (err) => {
    if (err) {
      console.log(err);
      return res.status(401).json(err);
    }

    await Model.updateOne(
      { _id: mongoose.Types.ObjectId(req.params.id) },
      {
        $unset: {
          logo: null,
        },
      }
    ).exec();
    return res.json({ success: 1 });
  });
});

router.post("/:id/upload", upload.single("file"), async (req, res) => {
  const logo = req.file ? req.file : null;

  await Model.updateOne(
    { _id: mongoose.Types.ObjectId(req.params.id) },
    {
      $set: {
        logo,
      },
    }
  ).exec();

  //update delivery receipts
  await DeliveryReceipt.updateMany(
    { "branch.company._id": mongoose.Types.ObjectId(req.params.id) },
    {
      $set: {
        "branch.company.logo": logo,
      },
    }
  ).exec();

  return res.json({ success: 1 });
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
        ...(record.logs || []),
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
        .then(async (record) => {
          const _record = { ...record.toObject() };

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
