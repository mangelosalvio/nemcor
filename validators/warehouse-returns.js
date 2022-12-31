const { SOURCE_DEPOT, SOURCE_SUPPLIER } = require("../config/constants");
const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  if (isEmpty(data.tanker)) {
    errors.tanker = "Tanker is required";
  }

  if (isEmpty(data.warehouse)) {
    errors.warehouse = "Warehouse/Depot is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
