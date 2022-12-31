import axios from 'axios';
import { GET_TABLES } from './types';

export const getTables =  () => dispatch => {
  axios.get('/api/tables')
    .then(response => dispatch(setTables(response.data)))
    .catch(err => console.log(err))
}

export const setTables = (tables) => {
  return {
    type : GET_TABLES,
    payload : tables
  }
}