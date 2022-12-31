import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";
import round from "../utils/round";
import DatePickerFieldGroup from "../commons/DatePickerFieldGroup";

let callback;

const defaultState = {
  bank: null,
  name: null,
  check_no: null,
  check_date: null,
  amount: null,
};

export default class CheckModalForm extends Component {
  state = {
    ...defaultState,

    visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);

    this.bankRef = React.createRef();
    this.nameRef = React.createRef();
    this.checkNumberRef = React.createRef();
    this.checkDateRef = React.createRef();
    this.amountRef = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      if (this.bankRef.current) {
        this.bankRef.current.focus();
      }
    });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.bank)) {
      message.error("Bank is required");
      return;
    }

    if (isEmpty(this.state.name)) {
      message.error("Name is required");
      return;
    }

    if (isEmpty(this.state.check_no)) {
      message.error("Check No. is required");
      return;
    }

    if (isEmpty(this.state.check_date)) {
      message.error("Check Date is required");
      return;
    }

    if (isEmpty(this.state.amount)) {
      message.error("Amount is required");
      return;
    }

    const { bank, name, check_no, check_date, amount } = this.state;

    callback({
      bank,
      name,
      check_no,
      check_date,
      amount: round(amount),
    });

    this.setState({
      visible: false,
      ...defaultState,
    });
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <Modal
          title="Cheque Payment"
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
                  name="bank"
                  placeholder="Bank"
                  value={this.state.bank}
                  onChange={this.onChange}
                  ref={this.bankRef}
                  onPressEnter={() => this.nameRef.current.focus()}
                  autoFocus={true}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="name"
                  placeholder="Name"
                  value={this.state.name}
                  onChange={this.onChange}
                  ref={this.nameRef}
                  onPressEnter={() => this.checkNumberRef.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="check_no"
                  placeholder="Check No."
                  value={this.state.check_no}
                  onChange={this.onChange}
                  ref={this.checkNumberRef}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <DatePickerFieldGroup
                  label="Check Date"
                  name="check_date"
                  value={this.state.check_date}
                  onChange={(value) => {
                    this.setState({ check_date: value });
                    this.amountRef.current.focus();
                  }}
                  error={errors.check_date}
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
