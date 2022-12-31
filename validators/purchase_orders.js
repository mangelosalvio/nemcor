const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.supplier)) {
    errors.supplier = "Supplier is required";
  }
  if (isEmpty(data.supplier_delivery_type)) {
    errors.supplier_delivery_type = "Delivery Type is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
