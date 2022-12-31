import { GET_ERRORS } from './../actions/types'

const errorDefaultState = {
    errors : {}
};

export default ( state = errorDefaultState, action ) => {
    switch ( action.type ) {
        case GET_ERRORS : 
            return action.payload;
        default : 
            return state;
    }
}