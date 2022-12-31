import React, { Component } from "react";
import { connect } from "react-redux";
import TextFieldGroup from "../../commons/TextFieldGroup";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import MessageBoxInfo from "../../commons/MessageBoxInfo";
import Searchbar from "../../commons/Searchbar";
import "../../styles/Autosuggest.css";

import { Layout, Breadcrumb, Form, Table, Icon, message } from "antd";
import numberFormat from "../../utils/numberFormat";

import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import moment from "moment";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const collection_name = "account_payments";

const form_data = {
  [collection_name]: [],
  _id: "",
  account: "",
  amount: "",
  particulars: "",
  date: "",
  errors: {},
};

class AccountPayments extends Component {
  state = {
    title: "Account Payments",
    url: "/api/account-payments/",
    search_keyword: "",
    ...form_data,

    account_options: [],
  };

  onChange = (e) => {
    const target = e.target;
    const value = target.type === "checkbox" ? target.checked : target.value;

    this.setState({ [e.target.name]: value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const form_data = {
      ...this.state,
      user: this.props.auth.user,
    };

    if (isEmpty(this.state._id)) {
      axios
        .put(this.state.url, form_data)
        .then(({ data }) => {
          message.success("Transaction Saved");
          this.setState({
            ...data,
            date: data.date ? moment(data.date) : null,
            errors: {},
            message: "Transaction Saved",
          });
        })
        .catch((err) => {
          message.error("You have an invalid input");
          this.setState({ errors: err.response.data });
        });
    } else {
      axios
        .post(this.state.url + this.state._id, form_data)
        .then(({ data }) => {
          message.success("Transaction Updated");
          this.setState({
            ...data,
            date: data.date ? moment(data.date) : null,
            errors: {},
            message: "Transaction Updated",
          });
        })
        .catch((err) => this.setState({ errors: err.response.data }));
    }
  };

  onSearch = (value, e) => {
    e.preventDefault();

    axios
      .get(this.state.url + "?s=" + this.state.search_keyword)
      .then((response) =>
        this.setState({
          [collection_name]: response.data,
          message: isEmpty(response.data) ? "No rows found" : "",
        })
      )
      .catch((err) => console.log(err));
  };

  addNew = () => {
    this.setState({
      ...form_data,
      errors: {},
      message: "",
    });
  };

  edit = (record) => {
    axios
      .get(this.state.url + record._id)
      .then((response) => {
        const record = response.data;
        this.setState((prevState) => {
          return {
            ...form_data,
            [collection_name]: [],
            ...record,
            date: record.date ? moment(record.date) : null,
            errors: {},
          };
        });
      })
      .catch((err) => console.log(err));
  };

  onDelete = () => {
    axios
      .delete(this.state.url + this.state._id)
      .then((response) => {
        message.success("Transaction Deleted");
        this.setState({
          ...form_data,
          message: "Transaction Deleted",
        });
      })
      .catch((err) => {
        message.error(err.response.data.message);
      });
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  /**
   * ACCOUNTS SELECT
   */

  onAccountSearch = (value) => {
    axios
      .get(`/api/accounts/?s=${value}`)
      .then((response) => this.setState({ account_options: response.data }))
      .catch((err) => console.log(err));
  };

  onAccountChange = (value) => {
    this.setState((prevState) => {
      return {
        account: prevState.account_options[value],
      };
    });
  };

  render() {
    const records_column = [
      {
        title: "Date",
        dataIndex: "date",
        render: (date) => <span>{moment(date).format("ll")}</span>,
      },
      {
        title: "Account",
        dataIndex: "account.name",
      },
      {
        title: "Company Name",
        dataIndex: "account.company_name",
      },
      {
        title: "Particulars",
        dataIndex: "particulars",
      },
      {
        title: "Amount",
        align: "right",
        dataIndex: "amount",
        render: (amount) => <span>{numberFormat(amount)}</span>,
      },
      {
        title: "",
        key: "action",
        width: 10,
        render: (text, record) => (
          <i
            class="fa-solid fa-pen-to-square"
            onClick={() => this.edit(record)}
          ></i>
        ),
      },
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Home</Breadcrumb.Item>
              <Breadcrumb.Item>Tables</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <div className="column">
            <Searchbar
              name="search_keyword"
              onSearch={this.onSearch}
              onChange={this.onChange}
              value={this.state.search_keyword}
              onNew={this.addNew}
            />
          </div>
        </div>

        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <span className="is-size-5">{this.state.title}</span> <hr />
          <MessageBoxInfo message={this.state.message} onHide={this.onHide} />
          {isEmpty(this.state[collection_name]) ? (
            <Form onSubmit={this.onSubmit}>
              <DatePickerFieldGroup
                label="Date"
                name="date"
                value={this.state.date}
                onChange={(value) => this.setState({ date: value })}
                error={errors.date}
                formItemLayout={formItemLayout}
              />

              <SelectFieldGroup
                label="Account"
                name="account"
                value={this.state.account && this.state.account.name}
                onChange={this.onAccountChange}
                onSearch={this.onAccountSearch}
                error={errors.account && errors.account}
                formItemLayout={formItemLayout}
                data={this.state.account_options}
              />

              <TextFieldGroup
                label="Particulars"
                name="particulars"
                value={this.state.particulars}
                error={errors.particulars}
                formItemLayout={formItemLayout}
                onChange={this.onChange}
              />

              <TextFieldGroup
                label="Amount"
                name="amount"
                value={this.state.amount}
                error={errors.amount}
                formItemLayout={formItemLayout}
                onChange={this.onChange}
              />

              <Form.Item className="m-t-1" {...tailFormItemLayout}>
                <div className="field is-grouped">
                  <div className="control">
                    <button className="button is-small is-primary">Save</button>
                  </div>
                  {!isEmpty(this.state._id) ? (
                    <span
                      className="button is-danger is-outlined is-small"
                      onClick={this.onDelete}
                    >
                      <span>Delete</span>
                      <span className="icon is-small">
                        <i className="fas fa-times" />
                      </span>
                    </span>
                  ) : null}
                </div>
              </Form.Item>
            </Form>
          ) : (
            <Table
              dataSource={this.state[collection_name]}
              columns={records_column}
              rowKey={(record) => record._id}
            />
          )}
        </div>
      </Content>
    );
  }
}

const mapToState = (state) => {
  return {
    auth: state.auth,
  };
};

export default connect(mapToState)(AccountPayments);
