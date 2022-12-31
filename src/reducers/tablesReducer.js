import { GET_TABLES } from './../actions/types'

const tablesDefaultState = {
  tables : []
}

export default ( state = tablesDefaultState, action ) => {
  switch ( action.type ) {
    case GET_TABLES :
      return action.payload;
    default : 
      return state;
  }

}