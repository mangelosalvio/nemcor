import numeral from "numeral";
export default (value, digits = 2) => {
  let format = "0.";
  format += "0".repeat(digits);

  return numeral(numeral(value).format(format)).value();
};
