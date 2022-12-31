const Validator = require("validator");
const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (Validator.isEmpty(data.name)) {
    errors.name = "Name is required";
  }

  if (Validator.isEmpty(data.password_confirmation)) {
    errors.password_confirmation = "Password Confirmation is required";
  }

  if (!Validator.equals(data.password, data.password_confirmation)) {
    errors.password_confirmation = "Passwords does not match";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};

module.exports.validateWaiterUpdate = (data) => {
  let errors = {};

  if (!isEmpty(data.password)) {
    if (!Validator.equals(data.password, data.password_confirmation)) {
      errors.password_confirmation = "Password does not match";
    }
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
