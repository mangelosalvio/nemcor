import React, { Component } from "react";
import { connect } from "react-redux";
import TextFieldGroup from "../../commons/TextFieldGroup";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import MessageBoxInfo from "../../commons/MessageBoxInfo";
import Searchbar from "../../commons/Searchbar";
import "../../styles/Autosuggest.css";

import { Layout, Breadcrumb, Form, Tabs, Table, Icon, message } from "antd";
import numberFormat from "../../utils/numberFormat";
import moment from "moment";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";

const { Content } = Layout;
const TabPane = Tabs.TabPane;

const collection_name = "accounts";

const form_data = {
  [collection_name]: [],
  _id: "",

  name: "",
  company_name: "",
  ledger: [],

  errors: {},
};

class Account extends Component {
  state = {
    title: "Accounts",
    url: "/api/accounts/",
    search_keyword: "",
    ...form_data,
    options: {},
  };

  componentDidMount() {}

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onObjectChange = (object, e) => {
    this.setState({
      [object]: {
        ...this.state[object],
        [e.target.name]: e.target.value,
      },
    });
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
            ...form_data,
            ...data,
            errors: {},
            message: "Transaction Saved",
          });
        })
        .catch((err) => this.setState({ errors: err.response.data }));
    } else {
      axios
        .post(this.state.url + this.state._id, form_data)
        .then(({ data }) => {
          message.success("Transaction Updated");
          this.setState({
            ...form_data,
            ...data,
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
            errors: {},
          };
        });
      })
      .catch((err) => console.log(err));
  };

  onDelete = () => {
    axios
      .delete(this.state.url + this.state._id, {
        user: this.props.auth.user,
      })
      .then((response) => {
        this.setState({
          ...form_data,
          message: "Transaction Deleted",
        });
      })
      .catch((err) => console.log(err));
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  render() {
    const ledger_column = [
      {
        title: "Date",
        dataIndex: "date",
        render: (text, record, index) => (
          <span>{moment(record.date).format("lll")}</span>
        ),
      },
      {
        title: "Particulars",
        dataIndex: "particulars",
      },
      {
        title: "Debit",
        dataIndex: "debit_amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "Credit",
        dataIndex: "credit_amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "Balance",
        dataIndex: "balance",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
    ];

    const records_column = [
      {
        title: "Name",
        dataIndex: "name",
      },
      {
        title: "Company Name",
        dataIndex: "company_name",
      },
      {
        title: "Log",
        dataIndex: "logs",
        render: (logs, record) => <span>{logs[logs.length - 1].log}</span>,
      },
      {
        title: "",
        width: 100,
        key: "action",
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
              <Breadcrumb.Item>Accounts</Breadcrumb.Item>
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
              <Tabs
                type="card"
                onTabClick={(key, e) => {
                  if (key === "2") {
                    axios
                      .post(`/api/accounts/${this.state._id}/ledger`)
                      .then((response) => {
                        if (response.data) {
                          this.setState({
                            ledger: [...response.data],
                          });
                        }
                      });
                  }
                }}
              >
                <TabPane tab="Account Information" key="1">
                  <div>
                    <TextFieldGroup
                      label="Name"
                      name="name"
                      value={this.state.name}
                      onChange={this.onChange}
                      error={errors.name}
                      formItemLayout={formItemLayout}
                    />

                    <TextFieldGroup
                      label="Company Name"
                      name="company_name"
                      value={this.state.company_name}
                      onChange={this.onChange}
                      error={errors.company_name}
                      formItemLayout={formItemLayout}
                    />

                    <Form.Item {...tailFormItemLayout}>
                      <div className="field is-grouped">
                        <div className="control">
                          <button className="button is-primary is-small">
                            Save
                          </button>
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
                  </div>
                </TabPane>
                {this.state._id && (
                  <TabPane tab="Ledger" key="2">
                    <Table
                      dataSource={this.state.ledger}
                      columns={ledger_column}
                      rowKey="_id"
                    />
                    <Form.Item className="m-t-1">
                      <div className="field is-grouped">
                        <div className="control">
                          <button className="button is-small">Save</button>
                        </div>
                      </div>
                    </Form.Item>
                  </TabPane>
                )}
              </Tabs>
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

export default connect(mapToState)(Account);
