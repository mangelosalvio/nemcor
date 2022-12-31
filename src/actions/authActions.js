import axios from "axios";
import setAuthToken from "./../utils/setAuthToken";
import { GET_ERRORS, SET_CURRENT_USER } from "./types";
import jwt_decode from "jwt-decode";
import {
  USER_ADMIN,
  USER_BODEGA,
  USER_DISPATCHER,
  USER_OWNER,
  USER_STAFF,
} from "../utils/constants";

export const loginUser =
  ({ username, password }, navigate) =>
  (dispatch) => {
    axios
      .post("/api/users/login", { username, password })
      .then((response) => {
        const { token, permissions, branches } = response.data;

        localStorage.setItem("jwtToken", token);
        setAuthToken(token);
        //Decode token to get user data
        const decoded = { ...jwt_decode(token), permissions, branches };

        //Set current user
        dispatch(setCurrentUser(decoded));

        navigate("/dashboard");

        /* if ([USER_STAFF].includes(decoded.role)) {
          navigate("/cashier");
        } else if ([USER_ADMIN, USER_OWNER].includes(decoded.role)) {
          navigate("/products");
        } else if ([USER_DISPATCHER].includes(decoded.role)) {
          navigate("/dispatches");
        } else if ([USER_BODEGA].includes(decoded.role)) {
          navigate("/bundling");
        } else {
          navigate("/products");
        } */
      })
      .catch((err) => {
        dispatch({
          type: GET_ERRORS,
          payload: err.response.data,
        });
      });
  };

export const setCurrentUser = (decoded) => {
  return {
    type: SET_CURRENT_USER,
    payload: decoded,
  };
};

export const logoutUser = () => (dispatch) => {
  localStorage.removeItem("jwtToken");
  setAuthToken(false);
  dispatch(setCurrentUser({}));
};
