const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RolePermissionSchema = new Schema({
  role: String,
  permissions: [
    {
      name: String,
      route: String,
      access: [String],
      parent_menu: String,
    },
  ],
});

module.exports = mongoose.model("permissions", RolePermissionSchema);
