import React, { Component } from "react";
import { withParams } from "./../utils/hoc";
import { loginUser } from "./../actions/authActions";
import { connect } from "react-redux";
import TextFieldGroup from "./../commons/TextFieldGroup";
import DeveloperFooter from "./../utils/DeveloperFooter";
import logo from "./../images/delicioso-logo.jpg";
import axios from "axios";

import { Form, Button } from "antd";

class LoginForm extends Component {
  state = {
    errors: {},
    username: "",
    password: "",
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    if (e) e.preventDefault();

    const form_data = {
      username: this.state.username,
      password: this.state.password,
    };

    this.props.loginUser(form_data, this.props.navigate);
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.errors !== this.props.errors) {
      this.setState({ errors: this.props.errors });
    }
  }

  componentDidMount() {
    if (this.props.auth.isAuthenticated) {
      this.props.navigate("/cashier");
    }
  }

  render() {
    const { errors } = this.state;
    return (
      <div className="container">
        <div className="columns">
          <div
            className="column box is-half is-offset-one-quarter"
            style={{ padding: "2rem", marginTop: "10rem" }}
          >
            <div
              className="has-text-centered has-text-weight-bold is-size-4"
              style={{ paddingTop: "3rem", paddingBottom: "4rem" }}
            >
              {/* <img src={logo} alt="logo" style={{ width: 200 }} /> */}
              <br />
              NEW ENERGY MARKETING CORP.
            </div>

            <Form
              layout="vertical"
              onFinish={() => {
                this.onSubmit();
              }}
            >
              <TextFieldGroup
                label="Username"
                error={errors.username}
                name="username"
                value={this.state.username}
                onChange={this.onChange}
              />

              <TextFieldGroup
                type="password"
                label="Password"
                error={errors.password}
                name="password"
                value={this.state.password}
                onChange={this.onChange}
              />

              <Form.Item style={{ marginTop: "24px" }}>
                <input
                  type="submit"
                  value="Log in"
                  className="button is-primary"
                />
              </Form.Item>
              <DeveloperFooter />
            </Form>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    errors: state.errors,
    auth: state.auth,
  };
};

export default connect(mapStateToProps, { loginUser })(withParams(LoginForm));
