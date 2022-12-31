const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.supplier)) {
    errors.supplier = "Supplier is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
