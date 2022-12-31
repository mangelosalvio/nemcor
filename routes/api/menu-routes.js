const express = require("express");
const router = express.Router();
const MenuRoute = require("./../../models/MenuRoute");
const RolePermission = require("./../../models/RolePermission");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const validateInput = require("./../../validators/menu-routes");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const User = require("../../models/User");
const Model = MenuRoute;
const ObjectId = mongoose.Types.ObjectId;

router.get("/parent-menus", (req, res) => {
  MenuRoute.aggregate([
    {
      $match: {
        parent_menu: {
          $ne: null,
        },
      },
    },
    {
      $group: {
        _id: "$parent_menu",
        parent_menu: {
          $first: "$parent_menu",
        },
        sequence: {
          $first: "$sequence",
        },
      },
    },
    {
      $sort: {
        sequence: 1,
      },
    },
  ])
    .then((records) => res.json(records))
    .catch((err) => res.status(401).json(err));
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
    .sort({ _id: 1 })
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
      const log = `Added by ${user.name} on ${datetime.format(
        "MM/DD/YY hh:mm A"
      )}`;

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

router.post("/listing", (req, res) => {
  const parent_menu = req.body.parent_menu;
  const form_data = {
    parent_menu,
  };

  Model.find(form_data)
    .sort({ sequence: 1 })
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
    limit: 100,
  })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/:id/update-attribute", (req, res) => {
  const filtered_body = filterId(req);
  const user = req.body.user;

  let old_record;
  Model.findById(req.params.id).then((record) => {
    if (record) {
      old_record = { ...record.toObject() };

      const body = {
        ...filtered_body,
      };

      delete body.__v;

      record.set({
        ...body,
      });

      record
        .save()
        .then(async (record) => {
          //update permissions
          /* await RolePermission.updateMany(
            {
              "permissions.name": old_record.name,
            },
            {
              $set: {
                "permissions.$[elem].name": record.name,
                "permissions.$[elem].route": record.route,
                "permissions.$[elem].parent_menu": record.parent_menu,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.name": old_record.name,
                },
              ],
            }
          ).exec();

          await User.updateMany(
            {
              "permissions.name": old_record.name,
            },
            {
              $set: {
                "permissions.$[elem].name": record.name,
                "permissions.$[elem].route": record.route,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.name": old_record.name,
                },
              ],
            }
          ).exec();
 */
          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
      return res.status(401).json({ msg: "No record found" });
    }
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const filtered_body = filterId(req);
  const user = req.body.user;

  let old_record;
  Model.findById(req.params.id).then((record) => {
    if (record) {
      old_record = { ...record.toObject() };
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Modified by ${user.name} on ${datetime.format(
        "MM/DD/YY hh:mm A"
      )}`;

      const body = {
        ...filtered_body,
      };

      record.set({
        ...body,
      });

      record
        .save()
        .then(async (record) => {
          //update permissions
          await RolePermission.updateMany(
            {
              "permissions.name": old_record.name,
            },
            {
              $set: {
                "permissions.$[elem].name": record.name,
                "permissions.$[elem].route": record.route,
                "permissions.$[elem].parent_menu": record.parent_menu,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.name": old_record.name,
                },
              ],
            }
          ).exec();

          await User.updateMany(
            {
              "permissions.name": old_record.name,
            },
            {
              $set: {
                "permissions.$[elem].name": record.name,
                "permissions.$[elem].route": record.route,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.name": old_record.name,
                },
              ],
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

router.delete("/:id", async (req, res) => {
  const record = await Model.findOne({ _id: ObjectId(req.params.id) });
  const route = record.route;

  await User.updateMany(
    {},
    {
      $pull: {
        permissions: route,
      },
    }
  ).exec();

  await RolePermission.updateMany(
    {},
    {
      $pull: {
        permissions: route,
      },
    }
  ).exec();

  Model.findByIdAndRemove(req.params.id)
    .then((response) => res.json({ success: 1 }))
    .catch((err) => console.log(err));
});

module.exports = router;
