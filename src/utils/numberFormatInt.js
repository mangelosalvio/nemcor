import numeral from "numeral";

export default (value) => {
  return numeral(value).format("0,0");
};
