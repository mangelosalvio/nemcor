const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateCategoryInput(data) {
    let errors = {};

    if ( Validator.isEmpty(data.name) ) {
        errors.name = 'Name is required';
    }

    return {
        errors,
        isValid : isEmpty(errors)
    }
}