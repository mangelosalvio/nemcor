import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";

import isEmpty from "../validation/is-empty";

let callback;
export default class CustomerInfoForm extends Component {
  state = {
    name: "",
    address: "",
    tin: "",
    business_style: "",
    contact_no: "",
    time: "",
    visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);
    this.nameInput = React.createRef();
    this.addressInput = React.createRef();
    this.tinInput = React.createRef();
    this.contactNumberInput = React.createRef();
    this.businessStyleInput = React.createRef();
    this.timeField = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.name)) {
      message.error("Name is required");
      return;
    }

    callback(this.state);

    this.setState({
      visible: false,
      name: "",
      address: "",
      tin: "",
      business_style: "",
      contact_no: "",
      time: "",
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Customer Information"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="name"
                  placeholder="Name"
                  value={this.state.name}
                  onChange={this.onChange}
                  ref={this.nameInput}
                  onPressEnter={() => this.addressInput.current.focus()}
                  autoFocus={true}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="address"
                  placeholder="Address"
                  value={this.state.address}
                  onChange={this.onChange}
                  ref={this.addressInput}
                  onPressEnter={() => this.contactNumberInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="contact_no"
                  placeholder="Contact No."
                  value={this.state.contact_no}
                  onChange={this.onChange}
                  ref={this.contactNumberInput}
                  onPressEnter={() => this.tinInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="tin"
                  placeholder="TIN"
                  value={this.state.tin}
                  onChange={this.onChange}
                  ref={this.tinInput}
                  onPressEnter={() => this.businessStyleInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="business_style"
                  placeholder="Business Style"
                  value={this.state.business_style}
                  onChange={this.onChange}
                  ref={this.businessStyleInput}
                  onPressEnter={() => this.timeField.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="time"
                  placeholder="Time"
                  value={this.state.time}
                  onChange={this.onChange}
                  ref={this.timeField}
                  onPressEnter={this.onSubmit}
                  autoComplete="off"
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
