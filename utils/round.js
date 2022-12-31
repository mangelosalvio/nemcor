const numeral = require("numeral");

const round = value => {
  return numeral(numeral(value).format("0.00")).value();
};

module.exports = round;
