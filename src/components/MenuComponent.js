import React from "react";
import { Route, Navigate, Link } from "react-router-dom";
import { connect } from "react-redux";
import { Layout, Menu, Icon } from "antd";
import Sider from "antd/lib/layout/Sider";
import { USER_ADMIN, USER_OWNER } from "./../utils/constants";
import { logoutUser } from "./../actions/authActions";
import logo from "./../images/delicioso-logo.jpg";
import MenuPermission from "../commons/MenuPermission";
import SubMenuPermission from "../commons/SubMenuPermission";

const { SubMenu } = Menu;
const { Content, Footer } = Layout;

const MenuComponent = ({ component: Component, auth, logoutUser, ...rest }) => {
  return (
    <Layout className="layout is-full-height">
      <Layout className="is-full-height-vh">
        <Sider
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            marginTop: "0px",
          }}
        >
          <div className="logo">
            <span>
              {/* <img src={logo} alt="inaka-logo" /> */}
              NEMCOR
            </span>
            <div>
              <i className="fa-solid fa-user pad-right-8"></i>

              <span
                style={{
                  fontSize: "10px",
                }}
              >
                {auth.user.name}
                <div>{auth?.user?.company?.name || ""}</div>
              </span>
              <div className="has-text-weight-bold">
                <span
                  onClick={() => logoutUser()}
                  style={{
                    padding: "2px 5px",
                    fontSize: "10px",
                    marginTop: "6px",
                    color: "#fff",
                  }}
                >
                  <i className="fa-solid fa-key pad-right-8"></i>
                  Logout
                </span>
              </div>
            </div>
          </div>
          <Menu theme="dark">
            <SubMenu
              key="/masterfiles"
              title={
                <span>
                  <i className="fas fa-grip-horizontal"></i>
                  Master Files
                </span>
              }
            >
              <MenuPermission to="/categories" label="Categories" />
              <MenuPermission to="/products" label="Products" />
              <MenuPermission
                to="/stock-branch-pricing"
                label="Branch Pricing"
              />

              {/* <MenuPermission to="/departments" label="Departments" />
              <MenuPermission to="/unit-of-measures" label="Unit of Measure" />
              <MenuPermission to="/categories" label="Categories" />
              <MenuPermission to="/areas" label="Areas" />
              <MenuPermission to="/suppliers" label="Suppliers" /> */}
              <MenuPermission to="/companies" label="Companies" />
              {/* <MenuPermission to="/products" label="Products" /> */}
              <MenuPermission to="/employees" label="Employees" />
              {/* <MenuPermission to="/customers" label="Customers" /> */}
              <MenuPermission to="/branches" label="Branches" />
            </SubMenu>

            <SubMenu
              key="inventory"
              title={
                <span>
                  <span>
                    <i className="fas fa-folder-open"></i>
                  </span>
                  Inventory
                </span>
              }
            ></SubMenu>
            <SubMenu
              key="payroll"
              title={
                <span>
                  <span>
                    <i className="fas fa-folder-open"></i>
                  </span>
                  Payroll
                </span>
              }
            >
              <MenuPermission to="/deductions" label="Deductions" />
              <MenuPermission
                to="/scheduled-deductions"
                label="Scheduled Deductions"
              />
              <MenuPermission to="/attendance" label="Attendance" />
              <MenuPermission to="/payroll" label="Payroll" />
              <MenuPermission
                to="/reports/payroll-check-voucher-form"
                label="Payslip"
              />
            </SubMenu>

            {/* <MenuPermission
              to="/account-settings"
              icon="fa-cog"
              label="Settings"
            /> */}

            {auth.user.username === "msalvio" && (
              <Menu.Item key="menu-routes">
                <Link to="/menu-routes">
                  <span>
                    <i className={`fas fa-folder-open`}></i>
                    Menu Routes
                  </span>
                </Link>
              </Menu.Item>
            )}

            <SubMenuPermission
              to="/user-management"
              title={
                <span>
                  <i className="fas fa-users-cog"></i>
                  User Management
                </span>
              }
            >
              <MenuPermission to="/roles" label="Roles" />
              <MenuPermission to="/users" icon="fa-users" label="Users" />
              <MenuPermission
                to="/permissions"
                icon="fa-user-cog"
                label="Permissions"
              />
            </SubMenuPermission>

            <MenuPermission
              to="/update-password"
              icon="fa-lock"
              label="Update Password"
            />
          </Menu>

          <Layout />
        </Sider>
        <Layout style={{ marginLeft: 200 }}>
          <Content style={{ overflow: "auto" }}>
            <Component {...rest} />
          </Content>
          <Footer style={{ textAlign: "center" }}>
            ©2023 - powered by{" "}
            <span className="has-text-weight-bold">
              msalvio software & hardware technologies
            </span>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, { logoutUser })(MenuComponent);
