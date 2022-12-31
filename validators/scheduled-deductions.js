const isEmpty = require("./isEmpty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }
  if (isEmpty(data.start_date)) {
    errors.start_date = "Start Date is required";
  }

  if (isEmpty(data.employee)) {
    errors.employee = "Employee is required";
  }

  if (isEmpty(data.deduction)) {
    errors.deduction = "Deduction is required";
  }

  if (isEmpty(data.total_amount)) {
    errors.total_amount = "Total Amount is required";
  }

  if (isEmpty(data.no_of_pay_days)) {
    errors.no_of_pay_days = "No. of pay days is required";
  }

  if (isEmpty(data.deduction_amount)) {
    errors.deduction_amount = "Deduction amount is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
