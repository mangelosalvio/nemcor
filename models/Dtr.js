const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DtrSchema = new Schema({
    id_no : {
        type : String,
        required : true
    },
    date : {
        type : Number,
        required : true
    },
    shift_in : {
        type : Number
    },
    lunch_out : {
        type : Number
    },
    lunch_in : {
        type : Number
    },
    shift_out : {
        type : Number
    }
})

module.exports = mongoose.model('dtr',DtrSchema);