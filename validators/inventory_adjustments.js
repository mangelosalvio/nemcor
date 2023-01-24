const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }
  if (isEmpty(data.branch)) {
    errors.branch = "Branch is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
