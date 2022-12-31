const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.name)) {
    errors.name = "Name is required";
  }

  if (isEmpty(data.route)) {
    errors.route = "Route is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
