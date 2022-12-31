import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";

let callback;
export default class SaleVoidReasonModal extends Component {
  state = {
    reason: "",
    visible: false,
  };

  constructor(props) {
    super(props);
    this.reason_input = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      if (this.reason_input.current) {
        console.log(this.reason_input);
        this.reason_input.current.focus();
      }
    });

    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.reason)) {
      message.error("Reason is empty");
      return;
    }
    callback(this.state.reason);
    this.setState({ visible: false, reason: "" });
  };

  render() {
    return (
      <div>
        <Modal
          title="Void Reason"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="reason"
                  placeholder="State Reason"
                  value={this.state.reason}
                  onChange={this.onChange}
                  autoFocus={true}
                  ref={this.reason_input}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
