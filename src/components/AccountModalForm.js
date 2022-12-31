import React, { Component } from "react";
import { Form, Modal, message } from "antd";
import axios from "axios";

import SelectFieldGroup from "../commons/SelectFieldGroup";
import { formItemLayout } from "../utils/Layouts";
import isEmpty from "../validation/is-empty";
import CheckboxFieldGroup from "../commons/CheckboxFieldGroup";

let callback;
const form_data = {
  account: null,
  is_other_set: false,
  user: "",
};
export default class AccountModalForm extends Component {
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
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    this.setState({ [e.target.name]: value });
  };

  onSubmit = (e) => {
    if (e) e.preventDefault();

    if (isEmpty(this.state.account) && isEmpty(this.state.account.name)) {
      message.error("Select an account");
      return;
    }

    const { account, is_other_set } = this.state;
    callback({ account, is_other_set });
    this.setState({
      ...form_data,
      visible: false,
    });
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
    this.setState(
      (prevState) => {
        return {
          account: prevState.options.accounts[index],
        };
      },
      () => {
        this.onSubmit();
      }
    );
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <Modal
          title="Select Account"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              {/* <CheckboxFieldGroup
                label="Set B"
                name="is_other_set"
                onChange={this.onChange}
                error={errors.is_other_set}
                checked={this.state.is_other_set}
                formItemLayout={formItemLayout}
              /> */}

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
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
