import React, { Component } from "react";
import { Form, Modal, message } from "antd";
import axios from "axios";
import isEmpty from "../validation/is-empty";
import SelectFieldGroup from "../commons/SelectFieldGroup";
import { formItemLayout } from "../utils/Layouts";
import TextFieldGroup from "../commons/TextFieldGroup";

let callback;
export default class AccountBillingForm extends Component {
  state = {
    account: "",
    claimed_by: "",
    visible: false,
    options: {
      accounts: []
    },
    errors: {}
  };

  constructor(props) {
    super(props);
    this.accountBillingField = React.createRef();
    this.claimedByInput = React.createRef();
  }

  open = c => {
    this.setState({ visible: true }, () => {
      if (this.accountBillingField.current !== null) {
        this.accountBillingField.current.focus();
      }
    });
    callback = c;
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();

    if (isEmpty(this.state.account)) {
      message.error("Please select an account");
      return;
    }

    callback({
      ...this.state.account,
      claimed_by: this.state.claimed_by
    });

    this.setState({
      visible: false,
      account: {}
    });
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
    this.claimedByInput.current.focus();
    this.setState(prevState => {
      return {
        account: prevState.options.accounts[index]
      };
    });
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <Modal
          title="Account Billing Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
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
                <TextFieldGroup
                  label="Claimed By"
                  name="claimed_by"
                  value={this.state.claimed_by}
                  onChange={this.onChange}
                  error={errors.claimed_by}
                  formItemLayout={formItemLayout}
                  inputRef={this.claimedByInput}
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
