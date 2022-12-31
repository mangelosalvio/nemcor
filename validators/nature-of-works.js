const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.name)) {
    errors.name = "Name is required";
  }

  if (isEmpty(data.rate) && !data.is_milling) {
    errors.rate = "Rate is required";
  }

  if (isEmpty(data.work_type)) {
    errors.work_type = "Type is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
