const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }
  if (isEmpty(data.branch)) {
    errors.branch = "Branch is required";
  }
  if (isEmpty(data.account)) {
    errors.account = "Account is required";
  }
  if (isEmpty(data.return_stock_option)) {
    errors.return_stock_option = "Return Option is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
