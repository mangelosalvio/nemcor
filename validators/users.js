const Validator = require("validator");
const isEmpty = require("./is-empty");

module.exports.validateUserUpdate = data => {
  let errors = {};

  if (!Validator.isLength(data.name, { min: 2, max: 30 })) {
    errors.name = "Name must be between 2 and 30 characters";
  }

  if (isEmpty(data.username)) {
    errors.username = "Username is required";
  }

  if (!isEmpty(data.password)) {
    if (!Validator.equals(data.password, data.password_confirmation)) {
      errors.password_confirmation = "Password does not match";
    }
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

module.exports.validateRegisterInput = data => {
  let errors = {};

  console.log(data);

  if (!Validator.isLength(data.name, { min: 2, max: 30 })) {
    errors.name = "Name must be between 2 and 30 characters";
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = "Password is required";
  }

  if (Validator.isEmpty(data.username)) {
    errors.username = "Username is required";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

module.exports.validateNewUser = data => {
  let errors = {};

  if (!Validator.isLength(data.name, { min: 2, max: 30 })) {
    errors.name = "Name must be between 2 and 30 characters";
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = "Password is required";
  }

  if (Validator.isEmpty(data.password_confirmation)) {
    errors.password_confirmation = "Password Confirmation is required";
  }

  if (!Validator.equals(data.password, data.password_confirmation)) {
    errors.password_confirmation = "Passwords does not match";
  }

  if (Validator.isEmpty(data.username)) {
    errors.username = "Username is required";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

module.exports.validateUpdatePassword = data => {
  let errors = {};

  if (Validator.isEmpty(data.password)) {
    errors.password = "Password is required";
  }

  if (Validator.isEmpty(data.password_confirmation)) {
    errors.password_confirmation = "Password Confirmation is required";
  }

  if (!Validator.equals(data.password, data.password_confirmation)) {
    errors.password_confirmation = "Passwords does not match";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};
