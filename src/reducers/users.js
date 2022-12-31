import { LOGIN_USER, SET_CURRENT_USER } from './../actions/types'
import isEmpty from './../validation/is-empty';

const userDefaultState = {
    isAuthenticated : false,
    user : {}
};

export default (state = userDefaultState, action) => {
    switch ( action.type ) {
        case LOGIN_USER : 
            return {
                user : action.user
            }
        case SET_CURRENT_USER : 
            return {
                ...state,
                isAuthenticated : !isEmpty(action.payload),
                user : action.payload
            }
            
        default : 
            return state;
    }

}