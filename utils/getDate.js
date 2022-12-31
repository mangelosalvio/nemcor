const moment = require("moment-timezone");
const getDate = () => {
  return moment.tz(moment(), process.env.TIMEZONE);
};
module.exports = getDate;
