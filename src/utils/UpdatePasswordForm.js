import React, { Component } from "react";
import TextFieldGroup from "../commons/TextFieldGroup";
import axios from "axios";
import MessageBoxInfo from "../commons/MessageBoxInfo";
import { connect } from "react-redux";

const form_data = {
  _id: "",
  password: "",
  password_confirmation: "",
};

class UpdatePasswordForm extends Component {
  state = {
    title: "Update Password Form",
    url: "/api/users/update-password",

    errors: {},
    ...form_data,
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...this.state,
      user: this.props.auth.user,
    };
    axios
      .post(this.state.url, data)
      .then(({ data }) =>
        this.setState({
          ...form_data,
          errors: {},
          message: "Password updated",
        })
      )
      .catch((err) => this.setState({ errors: err.response.data }));
  };

  addNew = () => {
    this.setState({
      ...form_data,
      errors: {},
      message: "",
    });
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <div
          style={{ marginTop: "1rem", marginRight: "1rem", padding: "20px" }}
        >
          <span className="is-size-5 has-text-weight-bold">
            {this.state.title}
          </span>{" "}
          <hr />
          <MessageBoxInfo message={this.state.message} onHide={this.onHide} />
          <form onSubmit={this.onSubmit}>
            <div>
              <TextFieldGroup
                label="Password"
                type="password"
                name="password"
                value={this.state.password}
                onChange={this.onChange}
                error={errors.password}
              />

              <TextFieldGroup
                label="Password Confirmation"
                type="password"
                name="password_confirmation"
                value={this.state.password_confirmation}
                onChange={this.onChange}
                error={errors.password_confirmation}
              />

              <div className="field is-grouped">
                <div className="control">
                  <button className="button is-primary">Save</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    auth: state.auth,
  };
};

export default connect(mapStateToProps)(UpdatePasswordForm);
