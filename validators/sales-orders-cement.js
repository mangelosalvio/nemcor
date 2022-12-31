const {
  DELIVERY_TYPE_COMPANY_DELIVERED,
  DELIVERY_TYPE_PICKUP_DEPOT,
} = require("../config/constants");
const isEmpty = require("./is-empty");

module.exports = function validateInput(data) {
  let errors = {};

  if (isEmpty(data.date)) {
    errors.date = "Date is required";
  }
  if (isEmpty(data.date_needed)) {
    errors.date_needed = "Date Needed is required";
  }
  if (isEmpty(data.customer)) {
    errors.customer = "Customer is required";
  }
  if (isEmpty(data.delivery_type)) {
    errors.delivery_type = "Delivery Type is required";
  }

  if (
    data.delivery_type === DELIVERY_TYPE_COMPANY_DELIVERED &&
    isEmpty(data.purchase_order?._id)
  ) {
    errors.po = "PO required";
  }

  if (
    data.delivery_type === DELIVERY_TYPE_PICKUP_DEPOT &&
    isEmpty(data.purchase_order?._id)
  ) {
    errors.po = "PO required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
