import axios from 'axios';
import { GET_USER_DTR_SUMMARY } from './types'
// POST DTR

export const addDtr = ({id_no, option}) => dispatch => {
    axios.post('/api/dtr',{id_no, option})
      .then( ( {data} ) => {
        dispatch(setUserDtr(data));
      })
      .catch((err) => {
        console.log(err);
      });
};

export const setUserDtr = (dtr = {}, id_no = '') => {
    return {
        type : 'ADD_DTR',
        dtr,
        id_no
    }
}

export const getUserDtrSummary = ({ startDate, endDate, id_no }) => dispatch => {
  const form_data = {
    startDate : startDate.valueOf(),
    endDate : endDate.valueOf(),
    id_no
  }

  axios.post(`/api/dtr/summary`,form_data)  
    .then(({data}) => {
      console.log(data);
      dispatch(setUserDtrSummary(data));
    })
    .catch((err) => console.log(err));
}

export const setUserDtrSummary = (data) => {
  return {
    type : GET_USER_DTR_SUMMARY,
    dtr_summary : data
  };

}



