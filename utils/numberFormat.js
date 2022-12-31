const numeral = require("numeral");

const numberFormat = (value) => {
  return numeral(value).format("(0,0.00)");
};

module.exports = numberFormat;
