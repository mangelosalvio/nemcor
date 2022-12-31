const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.name)) {
    errors.name = "Name is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
