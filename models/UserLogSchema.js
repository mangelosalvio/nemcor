const mongoose = require("mongoose");
module.exports = {
  id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
  },
  username: {
    type: String,
  },
};
