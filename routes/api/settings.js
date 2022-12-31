const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");

router.get("/date", (req, res) => {
  const date = moment.tz(moment(), process.env.TIMEZONE);
  return res.json({ date });
});

module.exports = router;
