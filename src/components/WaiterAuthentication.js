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
class WaiterAuthentication extends Component {
  state = {
    password: "",
    visible: false,
    supervisor_authentication: false,
    title: "Authentication Required",
    authentication_token: null,
    message: null,
    roles: [USER_ADMIN, USER_OWNER, USER_SUPERVISOR],
    waiter: null,
  };

  constructor(props) {
    super(props);
    this.username_field = React.createRef();
    this.password_field = React.createRef();
  }

  open = (c, waiter) => {
    this.setState(
      {
        visible: true,
        waiter,
        password: "",
      },
      () => {
        setTimeout(() => {
          if (this.password_field.current) {
            this.password_field.current.focus();
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
    const url = "/api/waiters/auth";

    axios
      .post(url, {
        waiter: this.state.waiter,
        password: this.state.password,
      })
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
                  prefix={
                    <Icon type="lock" style={{ color: "rgba(0,0,0,.25)" }} />
                  }
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

WaiterAuthentication.defaultProps = {
  focusInput: () => {},
};

export default WaiterAuthentication;
