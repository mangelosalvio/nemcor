import React, { Component } from "react";
import { Form, Modal, message } from "antd";
import axios from "axios";

import SelectFieldGroup from "../commons/SelectFieldGroup";
import { formItemLayout } from "../utils/Layouts";
import isEmpty from "../validation/is-empty";
import TextFieldGroup from "../commons/TextFieldGroup";
import round from "../utils/round";
import UserLoginForm from "./UserLoginForm";

let callback;
const form_data = {
  account: null,
  amount: null,
  user: "",
};
export default class ChargeToAccountModalForm extends Component {
  state = {
    ...form_data,
    visible: false,
    options: {
      accounts: [],
    },
    errors: {},
  };

  constructor(props) {
    super(props);
    this.amountRef = React.createRef();
    this.userLoginForm = React.createRef();
    this.accountRef = React.createRef();
  }

  open = (c, user) => {
    this.setState({ ...form_data, visible: true, user });
    callback = c;

    setTimeout(() => {
      this.accountRef.current.focus();
    }, 300);
  };

  onObjectChange = (object, e) => {
    this.setState({
      [object]: {
        ...this.state[object],
        [e.target.name]: e.target.value,
      },
    });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.account?.name)) {
      message.error("Select an account");
      return;
    }

    /* if (this.state.amount > this.state.account.balance) {
      message.error("Amount should be less than or equal to account balance");
      return;
    } */

    this.userLoginForm.current.open(
      (authorized_by) => {
        const { account, amount } = this.state;
        callback({ account, amount: round(amount), authorized_by });
        this.setState({
          ...form_data,
          visible: false,
        });
      },
      true,
      "Authentication Required for CHARGE TO ACCOUNT"
    );
  };

  onAccountSearch = (value) => {
    axios
      .get(`/api/accounts/?s=${value}`)
      .then((response) =>
        this.setState({
          options: {
            ...this.state.options,
            accounts: response.data,
          },
        })
      )
      .catch((err) => console.log(err));
  };

  onAccountChange = (index) => {
    const account = this.state.options.accounts[index];

    axios
      .post(`/api/accounts/${account._id}/balance`)
      .then((response) => {
        const { balance } = response.data;

        this.setState((prevState) => {
          return {
            account: {
              ...account,
              balance,
            },
          };
        });

        this.amountRef.current.focus();
      })
      .catch((err) =>
        message.error("There was an error getting the balance of customer")
      );
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <UserLoginForm
          ref={this.userLoginForm}
          focusInput={this.focusInput}
          supervisor_authentication={true}
          onCancel={() => this.amountRef?.current?.focus()}
        />
        <Modal
          title="Charge to Account Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <SelectFieldGroup
                label="Account"
                name="name"
                value={this.state.account && this.state.account.name}
                onChange={this.onAccountChange}
                onSearch={this.onAccountSearch}
                error={errors.account}
                formItemLayout={formItemLayout}
                data={this.state.options.accounts}
                autoFocus={true}
                inputRef={this.accountRef}
              />

              <TextFieldGroup
                label="Balance"
                type="number"
                name="amount"
                value={this.state.account?.balance}
                readOnly
                error={errors.account?.balance}
                formItemLayout={formItemLayout}
                autoComplete="off"
              />

              <TextFieldGroup
                label="Amount"
                type="number"
                name="amount"
                value={this.state.amount}
                onChange={this.onChange}
                error={errors.amount}
                formItemLayout={formItemLayout}
                inputRef={this.amountRef}
                onPressEnter={this.onSubmit}
                autoComplete="off"
              />
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
