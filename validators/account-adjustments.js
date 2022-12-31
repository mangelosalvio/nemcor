const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.account)) {
    errors.account = "Account is required";
  }

  if (isEmpty(data.amount)) {
    errors.amount = "Amount is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
