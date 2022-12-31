const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateRegisterInput(data) {
    let errors = {};

    console.log(data);

    if (!Validator.isLength(data.name, {min : 2, max :30})) {
        errors.name = 'Name must be between 2 and 30 characters';
    }

    if ( Validator.isEmpty(data.password) ) {
        errors.password = 'Password is required';
    }

    if ( Validator.isEmpty(data.username) ) {
        errors.username = 'Username is required';
    }

    return {
        errors,
        isValid : isEmpty(errors)
    }
}