const mongoose = require("mongoose");

module.exports = {
  _id: mongoose.Schema.Types.ObjectId,
  main_category: String,
  name: {
    type: String,
    required: true,
  },
};
