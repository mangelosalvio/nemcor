const {
  SOURCE_DEPOT,
  SOURCE_SUPPLIER,
  SOURCE_SUPPLIER_DEPOT,
} = require("../config/constants");
const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }

  // if (isEmpty(data.tanker)) {
  //   errors.tanker = "Tanker is required";
  // }

  if (
    isEmpty(data.warehouse) &&
    data.source_withdrawal === SOURCE_DEPOT &&
    data.source_depot_items?.length <= 0
  ) {
    errors.warehouse = "Warehouse is required";
    errors.source_depot_item =
      "Items taken form Depot (Tank Farm) is/are required";
  }

  // if (
  //   data.source_withdrawal === SOURCE_SUPPLIER &&
  //   data.source_tankers?.length <= 0
  // ) {
  //   errors.source_tankers = "Supplier W/D from Tanker is/are required";
  // }

  if (data.source_withdrawal === SOURCE_SUPPLIER_DEPOT) {
    if (isEmpty(data.warehouse) && data.source_depot_items?.length <= 0) {
      errors.warehouse = "Warehouse is required";
      errors.source_depot_item =
        "Items taken form Depot (Tank Farm) is/are required";
    }

    if (data.source_tankers?.length <= 0) {
      errors.source_tankers = "Supplier W/D from Tanker is/are required";
    }
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
