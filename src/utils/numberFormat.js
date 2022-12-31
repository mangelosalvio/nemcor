const numeral = require("numeral");

const numberFormat = (value, digits = 2) => {
  let format = "(0,0.";
  format += "0".repeat(digits);
  format += ")";
  return numeral(value).format(format);
};

module.exports = numberFormat;
