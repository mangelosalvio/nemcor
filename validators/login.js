const Validator = require('validator')
const isEmpty = require('./is-empty')

module.exports = function validateLoginData(data) {
    let errors = {};

    if ( Validator.isEmpty(data.username) ) {
        errors.username = 'Username field is required';
    }

    if ( Validator.isEmpty(data.password) ) {
        errors.password = 'Password field is required';
    }

    return {
        errors,
        isValid : isEmpty(errors)
    }

}