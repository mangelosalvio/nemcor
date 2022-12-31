const Validator = require("validator");
const isEmpty = require("./is-empty");

module.exports = function validate(data) {
  let errors = {};

  if (data.items.length <= 0) {
    errors.from_gc_no = "Should have gift checks generated";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};
