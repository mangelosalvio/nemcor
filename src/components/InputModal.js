import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";

let callback;
export default class InputModal extends Component {
  state = {
    input: "",
    visible: false,
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      setTimeout(() => {
        if (this.input_field.current) {
          this.input_field.current.focus();
        }
      }, 300);
    });

    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.input)) {
      message.error("Field is required");
      return;
    }
    callback(this.state.input);
    this.setState({ visible: false, input: "" });
  };

  render() {
    return (
      <div>
        <Modal
          title={this.props.title}
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="input"
                  placeholder={this.props.placeholder}
                  value={this.state.input}
                  onChange={this.onChange}
                  autoFocus={true}
                  ref={this.input_field}
                  autoComplete="off"
                  onPressEnter={this.onSubmit}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
