const { PAYMENT_TYPE_CHARGE } = require("../config/constants");
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

  if (data.payment_type === PAYMENT_TYPE_CHARGE && isEmpty(data.due_date)) {
    errors.due_date = "Due Date is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
