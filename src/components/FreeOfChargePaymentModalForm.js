import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";
import round from "../utils/round";
import UserLoginForm from "./UserLoginForm";

let callback;

const defaultState = {
  name: null,
  remarks: null,
  amount: null,
};

export default class FreeOfChargePaymentModalForm extends Component {
  state = {
    ...defaultState,

    visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);

    this.nameRef = React.createRef();
    this.remarksRef = React.createRef();
    this.amountRef = React.createRef();
    this.userLoginForm = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      if (this.nameRef.current) {
        this.nameRef.current.focus();
      }
    });
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

    if (isEmpty(this.state.amount)) {
      message.error("Amount is required");
      return;
    }

    const { name, remarks, amount } = this.state;

    this.userLoginForm.current.open(
      (authorized_by) => {
        callback({
          name,
          remarks,
          amount: round(amount),
          authorized_by,
        });

        this.setState({
          visible: false,
          ...defaultState,
        });
      },
      true,
      "Authentication Required for F.O.C"
    );
  };

  render() {
    return (
      <div>
        <UserLoginForm
          ref={this.userLoginForm}
          focusInput={this.focusInput}
          supervisor_authentication={true}
          onCancel={() => this.amountRef?.current?.focus()}
        />
        <Modal
          title="Free of Charge Payment Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => {
            this.setState({ visible: false });
            this.props.onCancel();
          }}
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
                  ref={this.nameRef}
                  onPressEnter={() => this.remarksRef.current.focus()}
                  autoFocus={true}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="remarks"
                  placeholder="Remarks"
                  value={this.state.remarks}
                  onChange={this.onChange}
                  ref={this.remarksRef}
                  onPressEnter={() => this.amountRef.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="amount"
                  type="number"
                  placeholder="Amount"
                  value={this.state.amount}
                  onChange={this.onChange}
                  ref={this.amountRef}
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
