import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";

import isEmpty from "../validation/is-empty";

let callback;
export default class TableNameModal extends Component {
  state = {
    name: "",
    visible: false
  };

  constructor(props) {
    super(props);
    this.name_input = React.createRef();
  }

  open = c => {
    this.setState({ visible: true }, () => {
      if (this.name_input.current) {
        console.log(this.name_input);
        this.name_input.current.focus();
      }
    });

    callback = c;
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();

    if (isEmpty(this.state.name)) {
      message.error("Name empty");
      return;
    }

    callback(this.state.name);
    this.setState({
      visible: false,
      name: ""
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Table Name Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="name"
                  placeholder="Name"
                  value={this.state.name}
                  onChange={this.onChange}
                  autoFocus={true}
                  ref={this.name_input}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
