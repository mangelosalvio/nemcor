const express = require("express");
const router = express.Router();
const RolePermission = require("./../../models/RolePermission");
const isEmpty = require("./../../validators/isEmpty");
const filterId = require("./../../utils/filterId");
const moment = require("moment-timezone");
const User = require("../../models/User");

const Model = RolePermission;

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.post("/role", (req, res) => {
  const { role, parent_menu } = req.body;

  Model.aggregate([
    {
      $match: {
        role: role,
      },
    },
    {
      $unwind: {
        path: "$permissions",
      },
    },
    {
      $match: {
        "permissions.parent_menu": parent_menu,
      },
    },
    {
      $group: {
        _id: "$_id",
        role: {
          $first: "$role",
        },
        permissions: {
          $push: {
            access: "$permissions.access",
            _id: "$permissions._id",
            name: "$permissions.name",
            route: "$permissions.route",
            parent_menu: "$permissions.parent_menu",
          },
        },
      },
    },
  ])
    .then((records) => {
      return res.json(records?.[0] || {});
    })
    .catch((err) => console.log(err));
});

router.post("/", async (req, res) => {
  const { role, route, permission } = req.body;

  const count = await RolePermission.countDocuments({
    role,
    "permissions.route": route,
  });

  if (count > 0) {
    //update
    await RolePermission.updateOne(
      {
        role,
        "permissions.route": route,
      },
      {
        $set: {
          "permissions.$.access": permission.access,
          "permissions.$.parent_menu": permission.parent_menu,
        },
      }
    ).exec();
  } else {
    //push
    await RolePermission.updateOne(
      {
        role,
      },
      {
        $push: {
          permissions: {
            ...permission,
          },
        },
      },
      {
        upsert: true,
      }
    ).exec();
  }

  const role_permission = await RolePermission.findOne({ role });

  User.updateMany(
    {
      role,
    },
    {
      $set: {
        permissions: role_permission?.permissions || [],
      },
    }
  ).exec();

  return res.json({ success: true });
});

router.put("/", (req, res) => {
  const { role, permissions } = req.body;

  Model.findOneAndUpdate(
    {
      role,
    },
    {
      $set: {
        role,
        permissions,
      },
    },
    {
      upsert: true,
      new: true,
    }
  )
    .then((record) => {
      User.updateMany(
        {
          role: record.role,
        },
        {
          $set: {
            permissions: record.permissions,
          },
        }
      ).exec();

      return res.json(record);
    })
    .catch((err) => res.status(401).json(err));
});

module.exports = router;
