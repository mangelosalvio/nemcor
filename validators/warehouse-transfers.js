const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  /* if (
    isEmpty(data.sales_return) &&
    isEmpty(data.stock_release) &&
    isEmpty(data.stock_transfer) &&
    isEmpty(data.supplier)
  ) {
    errors.supplier = "Supplier is required";
  } */

  if (isEmpty(data.warehouse)) {
    errors.warehouse = "From Warehouse is required";
  }

  if (isEmpty(data.to_warehouse)) {
    errors.to_warehouse = "To Warehouse is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
