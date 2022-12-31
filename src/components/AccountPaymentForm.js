import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import axios from "axios";
import isEmpty from "../validation/is-empty";
import SimpleSelectFieldGroup from "../commons/SimpleSelectFieldGroup";
import { payment_options } from "../utils/Options";
import { PAYMENT_OPTION_CREDIT_CARD } from "../utils/constants";
import SelectFieldGroup from "../commons/SelectFieldGroup";
import { formItemLayout } from "../utils/Layouts";

let callback;
const form_data = {
  credit_card: {
    name: "",
    card: "",
    card_number: "",
    reference_number: "",
    approval_code: ""
  },
  payment_type: "Cash",
  account: "",
  amount: "",
  user: ""
};
export default class AccountPaymentForm extends Component {
  state = {
    ...form_data,
    visible: false,
    credit_card_options: [],
    options: {
      accounts: []
    },
    errors: {}
  };

  componentDidMount() {
    axios
      .get("/api/credit-cards")
      .then(response => {
        this.setState({ credit_card_options: response.data });
      })
      .catch(err => console.log(err));
  }

  open = (c, user) => {
    this.setState({ ...form_data, visible: true, user });
    callback = c;
  };

  onObjectChange = (object, e) => {
    this.setState({
      [object]: {
        ...this.state[object],
        [e.target.name]: e.target.value
      }
    });
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();
    const form_data = { ...this.state };

    const loading = message.loading("Processsing...");
    axios
      .put("/api/account-payments", form_data)
      .then(response => {
        loading();
        this.setState({
          ...form_data,
          visible: false
        });
        message.success("Transaction Successful");
      })
      .catch(err => {
        loading();
        message.error(
          "There was an error processing your request. Please complete details"
        );
        this.setState({
          errors: err.response.data
        });
      });

    callback(this.state);
  };

  onAccountSearch = value => {
    axios
      .get(`/api/accounts/?s=${value}`)
      .then(response =>
        this.setState({
          options: {
            ...this.state.options,
            accounts: response.data
          }
        })
      )
      .catch(err => console.log(err));
  };

  onAccountChange = index => {
    this.setState(prevState => {
      return {
        account: prevState.options.accounts[index]
      };
    });
  };

  render() {
    const { errors } = this.state;
    const credit_card_options = this.state.credit_card_options.map(
      card => card.name
    );
    return (
      <div>
        <Modal
          title="Account Payment Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <SelectFieldGroup
                label="Accounts"
                name="name"
                value={this.state.account && this.state.account.name}
                onChange={this.onAccountChange}
                onSearch={this.onAccountSearch}
                error={errors.account}
                formItemLayout={formItemLayout}
                data={this.state.options.accounts}
                inputRef={this.accountBillingField}
                autoFocus={true}
              />

              <Form.Item>
                <SimpleSelectFieldGroup
                  label="Payment Type"
                  name="payment_type"
                  value={this.state.payment_type}
                  onChange={value => this.setState({ payment_type: value })}
                  error={errors.payment_type}
                  options={payment_options}
                />
              </Form.Item>

              {this.state.payment_type === PAYMENT_OPTION_CREDIT_CARD && [
                <Form.Item>
                  <SimpleSelectFieldGroup
                    label="Card"
                    name="card"
                    value={this.state.credit_card.card}
                    onChange={value =>
                      this.setState({
                        credit_card: {
                          ...this.state.credit_card,
                          card: value
                        }
                      })
                    }
                    error={errors.card}
                    options={credit_card_options}
                  />
                </Form.Item>,
                <Form.Item>
                  <Input
                    name="name"
                    placeholder="Card Name"
                    value={this.state.credit_card.name}
                    onChange={e => this.onObjectChange("credit_card", e)}
                  />
                </Form.Item>,
                <Form.Item>
                  <Input
                    name="card_number"
                    placeholder="Card Number"
                    value={this.state.credit_card.card_number}
                    onChange={e => this.onObjectChange("credit_card", e)}
                  />
                </Form.Item>,
                <Form.Item>
                  <Input
                    name="reference_number"
                    placeholder="Reference Number"
                    value={this.state.credit_card.reference_number}
                    onChange={e => this.onObjectChange("credit_card", e)}
                  />
                </Form.Item>,
                <Form.Item>
                  <Input
                    name="approval_code"
                    placeholder="TRACE NUMBER"
                    value={this.state.credit_card.approval_code}
                    onChange={e => this.onObjectChange("credit_card", e)}
                  />
                </Form.Item>
              ]}
              {!isEmpty(this.state.payment_type) && (
                <Form.Item>
                  <Input
                    name="amount"
                    type="number"
                    placeholder="Amount"
                    value={this.state.amount}
                    onChange={this.onChange}
                    onPressEnter={this.onSubmit}
                  />
                </Form.Item>
              )}
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
