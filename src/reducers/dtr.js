import { GET_USER_DTR_SUMMARY }  from './../actions/types'

const dtrReducerDefaultState = {
    dtr : {},
    id_no : '',
    dtr_summary : []
};

export default ( state = dtrReducerDefaultState, action ) => {
    switch ( action.type ) {
        case 'ADD_DTR' :
            return {
                ...state,
                id_no : action.id_no,
                dtr : action.dtr
            }
        case GET_USER_DTR_SUMMARY : 
            return {
                ...state,
                dtr_summary : action.dtr_summary
            }
        default : 
            return state;

    }
}