const Validator = require("validator");
const isEmpty = require("./is-empty");

module.exports = function validate(data) {
  let errors = {};

  if (isEmpty(data.name)) {
    errors.name = "Name is required";
  }
  if (isEmpty(data.account_type)) {
    errors.account_type = "Account Type is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
