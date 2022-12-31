const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateTableInput(data) {
    let errors = {};

    if ( Validator.isEmpty(data.name) ) {
        errors.name = 'Name is required';
    }

    return {
        errors,
        isValid : isEmpty(errors)
    }
}