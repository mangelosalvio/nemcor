const isEmpty = require("./is-empty");

module.exports.validateInput = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.branch)) {
    errors.branch = "Branch is required";
  }

  if (isEmpty(data.application_date)) {
    errors.application_date = "Application Date is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};

module.exports.validateInventoryLedger = (data) => {
  let errors = {};

  if (isEmpty(data.warehouse)) {
    errors.warehouse = "Warehouse is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};

module.exports.validateStockCard = (data) => {
  let errors = {};

  if (isEmpty(data.warehouse)) {
    errors.warehouse = "Warehouse is required";
  }

  if (isEmpty(data.stock)) {
    errors.stock = "Item is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
