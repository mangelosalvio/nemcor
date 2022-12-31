const { SOURCE_SUPPLIER } = require("../config/constants");
const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.plate_no)) {
    errors.plate_no = "Plate No. is required";
  }

  // if (isEmpty(data.capacity)) {
  //   errors.capacity = "Capacity is required";
  // }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
