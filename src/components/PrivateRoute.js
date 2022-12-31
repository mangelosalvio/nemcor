import React from "react";
import { Route, Navigate, Link, Outlet } from "react-router-dom";
import { connect } from "react-redux";
import { Layout, Menu, Icon } from "antd";
import Sider from "antd/lib/layout/Sider";
import { USER_ADMIN, USER_OWNER } from "./../utils/constants";
import { logoutUser } from "./../actions/authActions";
import logo from "./../images/delicioso-logo.jpg";
import MenuPermission from "../commons/MenuPermission";

const { SubMenu } = Menu;
const { Content, Footer } = Layout;

const PrivateRoute = ({ component: Component, auth, logoutUser, ...rest }) => {
  const is_admin = [USER_ADMIN, USER_OWNER].includes(auth.user.role);

  return auth.isAuthenticated === true ? <Outlet /> : <Navigate to="/login" />;
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, { logoutUser })(PrivateRoute);
