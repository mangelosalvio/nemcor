import React, { Component } from "react";
import { Form, Icon, Input, Modal, message } from "antd";
import axios from "axios";
import {
  SOCKET_ENDPOINT,
  USER_OWNER,
  USER_ADMIN,
  USER_SUPERVISOR,
} from "../utils/constants";
import socketIoClient from "socket.io-client";
import { uniqueId } from "lodash";
import isEmpty from "../validation/is-empty";

let callback;
let socket = null;
class UserLoginForm extends Component {
  state = {
    username: "",
    password: "",
    visible: false,
    supervisor_authentication: false,
    title: "Authentication Required",
    authentication_token: null,
    message: null,
    roles: [USER_ADMIN, USER_OWNER, USER_SUPERVISOR],
  };

  constructor(props) {
    super(props);
    this.username_field = React.createRef();
    this.password_field = React.createRef();
  }

  componentDidMount() {
    socket = socketIoClient(SOCKET_ENDPOINT);
    socket.on("authenticate", (data) => {
      if (this.state.authentication_token === data.token) {
        callback(data.user);
        this.setState({ visible: false, authentication_token: null });
      }
    });
  }

  componentWillUnmount() {
    socket.close();
  }

  open = (c, supervisor_authentication = false, message = null) => {
    let roles = [USER_ADMIN, USER_OWNER, USER_SUPERVISOR];
    const authentication =
      typeof supervisor_authentication === "object"
        ? true
        : supervisor_authentication;

    if (typeof supervisor_authentication === "object") {
      roles = supervisor_authentication;
    }

    if (authentication) {
      const token = `request-authentication-${uniqueId()}`;
      this.setState({
        authentication_token: token,
      });

      socket.emit("request-authentication", {
        token,
        message,
      });
    }

    const title = authentication
      ? "Supervisor Authentication"
      : "Authentication";

    this.setState(
      {
        visible: true,
        supervisor_authentication: authentication,
        title,
        username: "",
        password: "",
        message,
        roles,
      },
      () => {
        setTimeout(() => {
          if (this.username_field.current) {
            this.username_field.current.focus();
          }
        }, 300);
      }
    );
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();
    const url = this.state.supervisor_authentication
      ? "/api/users/auth/supervisor"
      : "/api/users/auth";

    axios
      .post(url, this.state)
      .then((response) => {
        if (response.data) {
          callback(response.data);
          this.setState({ visible: false });
        } else {
          message.error("You don't have the permission");
        }
      })
      .catch((err) => {
        message.error("Invalid username/password");
      });
  };

  render() {
    return (
      <div>
        <Modal
          title={this.state.title}
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
          keyboard={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              {!isEmpty(this.state.message) && (
                <div className="has-text-weight-bold has-text-centered m-b-1">
                  {this.state.message}
                </div>
              )}

              <Form.Item>
                <Input
                  autoFocus={true}
                  name="username"
                  placeholder="Username"
                  value={this.state.username}
                  onChange={this.onChange}
                  onPressEnter={() => this.password_field.current.focus()}
                  ref={this.username_field}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  type="password"
                  placeholder="Password"
                  name="password"
                  value={this.state.password}
                  onChange={this.onChange}
                  onPressEnter={this.onSubmit}
                  ref={this.password_field}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}

UserLoginForm.defaultProps = {
  focusInput: () => {},
};

export default UserLoginForm;
