const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.customer)) {
    errors.customer = "Customer is required";
  }
  if (isEmpty(data.delivery_type)) {
    errors.delivery_type = "Delivery Type is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
