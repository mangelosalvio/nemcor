const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.name)) {
    errors.name = "Name is required";
  }
  if (isEmpty(data.packaging)) {
    errors.packaging = "Packaging is required";
  }

  if (isEmpty(data.unit)) {
    errors.unit = "Unit is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
