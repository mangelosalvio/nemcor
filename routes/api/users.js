const express = require("express");
const router = express.Router();
const User = require("./../../models/User");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("./../../config/keys");
const passport = require("passport");
const isEmpty = require("./../../validators/is-empty");
const UserValidation = require("./../../validators/users");
const moment = require("moment-timezone");
const constants = require("./../../config/constants");

const validateLoginData = require("./../../validators/login");
const { USER_OWNER, USER_ADMIN } = require("./../../config/constants");
const RolePermission = require("../../models/RolePermission");

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        name: {
          $regex: new RegExp("^" + req.query.s, "i"),
        },
      };

  User.find(form_data)
    .select({
      _id: 1,
      username: 1,
      name: 1,
      role: 1,
      branches: 1,
    })
    .sort({ name: 1 })
    .then((users) => {
      return res.json(users);
    })
    .catch((err) => console.log(err));
});

router.get("/:id/permissions", (req, res) => {
  User.findById(req.params.id)
    .then((user) =>
      res.json({
        permissions: user?.permissions || [],
        branch: user?.branch || [],
      })
    )
    .catch((err) => console.log(err));
});

router.get("/:id", (req, res) => {
  User.findById(req.params.id)
    .then((user) => res.json(user))
    .catch((err) => console.log(err));
});

router.post("/auth/supervisor", (req, res) => {
  const { isValid, errors } = validateLoginData(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({
    username: req.body.username,
    role: {
      $in: [...req.body.roles],
    },
  }).then((user) => {
    if (!user) {
      errors["username"] = "Username not found";
      return res.status(401).json(errors);
    }

    bcrypt.compare(req.body.password, user.password).then((isMatch) => {
      if (isMatch) {
        return res.json(user);
      } else {
        return res.status(401).json({ password: "Password is invalid" });
      }
    });
  });
});

router.post("/auth", (req, res) => {
  const { isValid, errors } = validateLoginData(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({
    username: req.body.username,
  }).then((user) => {
    if (!user) {
      errors["username"] = "Username not found";
      return res.status(401).json(errors);
    }

    bcrypt.compare(req.body.password, user.password).then((isMatch) => {
      if (isMatch) {
        return res.json(user);
      } else {
        return res.status(401).json({ password: "Password is invalid" });
      }
    });
  });
});

router.post("/login/admin", (req, res) => {
  const { isValid, errors } = validateLoginData(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({
    username: req.body.username,
    role: USER_ADMIN,
  }).then((user) => {
    if (!user) {
      errors["username"] = "Username not found";
      return res.status(401).json(errors);
    }

    bcrypt.compare(req.body.password, user.password).then((isMatch) => {
      if (isMatch) {
        const payload = {
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          company: user?.company || null,
        };

        //sign token

        jwt.sign(payload, keys.secretOrKey, {}, (err, token) => {
          return res.json({
            success: true,
            token: "Bearer " + token,
          });
        });
      } else {
        return res.status(401).json({ password: "Password is invalid" });
      }
    });
  });
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

  User.paginate(form_data, {
    sort: {
      name: 1,
    },
    select: {
      _id: 1,
      username: 1,
      name: 1,
      role: 1,
      branches: 1,
    },
    page,
    limit: 10,
  })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/login", (req, res) => {
  const { isValid, errors } = validateLoginData(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({
    username: req.body.username,
    $or: [
      {
        expires_at: null,
      },
      {
        expires_at: {
          $exists: false,
        },
      },
      {
        expires_at: {
          $gte: moment().endOf("day").toDate(),
        },
      },
    ],
  })
    .lean(true)
    .then((user) => {
      if (!user) {
        errors["username"] = "Username not found";
        return res.status(401).json(errors);
      }

      bcrypt.compare(req.body.password, user.password).then((isMatch) => {
        if (isMatch) {
          const payload = {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            // permissions: user.permissions,
          };

          //sign token

          jwt.sign(payload, keys.secretOrKey, {}, (err, token) => {
            return res.json({
              success: true,
              token: "Bearer " + token,
              permissions: user.permissions,
              branches: user.branches,
            });
          });
        } else {
          return res.status(401).json({ password: "Password is invalid" });
        }
      });
    });
});

router.post("/register", (req, res) => {
  const { errors, isValid } = UserValidation.validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({ username: req.body.username }).then((user) => {
    if (user) {
      return res.status(401).json({ username: "Username already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) => res.json(user))
            .catch((err) => console.log(err));
        });
      });
    }
  });
});

router.post("/update-password", (req, res) => {
  const { isValid, errors } = UserValidation.validateUpdatePassword(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findById(req.body.user.id).then((record) => {
    if (record) {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
          if (err) throw err;

          if (!isEmpty(req.body.password)) {
            record.password = hash;
          }

          record
            .save()
            .then((record) => {
              const { name, username, _id } = record;
              return res.json({ name, username, _id });
            })
            .catch((err) => console.log(err));
        });
      });
    } else {
      console.log("ID not found");
    }
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = UserValidation.validateUserUpdate(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findById(req.params.id).then((record) => {
    if (record) {
      const { name, username } = req.body;

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password || "", salt, async (err, hash) => {
          if (err) throw err;

          if (!isEmpty(req.body.password) && !isEmpty(req.body.password)) {
            record.password = hash;
          }

          const datetime = moment.tz(moment(), process.env.TIMEZONE);
          const log = `Modified by ${req.body.user.name} on ${datetime.format(
            "LLL"
          )}`;

          const logs = [
            ...record.logs,
            {
              user: req.body.user,
              datetime,
              log,
            },
          ];

          const role_permission = await RolePermission.findOne({
            role: req.body.role,
          });

          let permissions = [];

          if (role_permission?.permissions) {
            permissions = role_permission.permissions;
          }

          record.set({
            name,
            username,
            role: req.body.role,
            logs,
            permissions,
            branches: req.body.branches,
          });
          record
            .save()
            .then((record) => {
              const { name, username, _id, role, branch, company, branches } =
                record;
              return res.json({
                name,
                username,
                _id,
                role,
                branches,
                company,
              });
            })
            .catch((err) => console.log(err));
        });
      });
    } else {
      console.log("ID not found");
    }
  });
});

router.put("/", (req, res) => {
  const { errors, isValid } = UserValidation.validateNewUser(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  User.findOne({ username: req.body.username }).then(async (user) => {
    if (user) {
      return res.status(401).json({ username: "Username already exists" });
    } else {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Added by ${req.body.user.name} on ${datetime.format("LLL")}`;
      const logs = [
        {
          user: req.body.user,
          datetime,
          log,
        },
      ];

      const role_permission = await RolePermission.findOne({
        role: req.body.role,
      });

      let permissions = [];

      if (role_permission) {
        permissions = role_permission.permissions;
      }

      const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        role: req.body.role,
        branches: req.body?.branches,
        logs,
        permissions,
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) =>
              res.json({
                ...user,
                password: "",
                password_confirmation: "",
              })
            )
            .catch((err) => console.log(err));
        });
      });
    }
  });
});

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    return res.json({
      id: req.user.id,
      name: req.user.name,
      username: req.user.username,
    });
  }
);

router.delete("/:id", (req, res) => {
  User.deleteMany({ _id: req.params.id })
    .then((result) => res.json({ success: 1 }))
    .catch((err) => console.log(err));
});
module.exports = router;
