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

  /* if (
    isEmpty(data.sales_return) &&
    isEmpty(data.stock_release) &&
    isEmpty(data.stock_transfer) &&
    isEmpty(data.supplier)
  ) {
    errors.supplier = "Supplier is required";
  } */

  /* if (isEmpty(data.warehouse)) {
    errors.warehouse = "Warehouse is required";
  } */

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
