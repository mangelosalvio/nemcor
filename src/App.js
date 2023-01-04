import React, { Component } from "react";
import "./App.css";
import "bulma/css/bulma.css";
import "antd/dist/antd.css";
//import 'font-awesome/css/font-awesome.min.css';
import "@fortawesome/fontawesome-free/css/all.css";
import AppRouter from "./routers/AppRouter";
import { Provider } from "react-redux";
import store from "./store/configureStore";
import jwt_decode from "jwt-decode";
import setAuthToken from "./utils/setAuthToken";
import { setCurrentUser, logoutUser } from "./actions/authActions";
import moment from "moment";
import axios from "axios";

if (localStorage.getItem("jwtToken")) {
  setAuthToken(localStorage.jwtToken);
  const decoded = jwt_decode(localStorage.jwtToken);

  //get permission from the users table since the header would be too large if it includes the permissions
  axios
    .get(`/api/users/${decoded.id}/permissions`)
    .then((response) => {
      const { permissions, branches = [] } = response.data;
      store.dispatch(setCurrentUser({ ...decoded, permissions, branches }));
    })
    .catch((err) => console.log(err));

  store.dispatch(setCurrentUser(decoded));

  //check for expired token
  const currentTime = moment().valueOf() / 1000;

  if (currentTime > decoded.exp) {
    store.dispatch(logoutUser());
  }
}

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <AppRouter />
      </Provider>
    );
  }
}

export default App;
