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
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import moment from "moment";
import classnames from "classnames";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import validator from "validator";

const { Content } = Layout;
const TabPane = Tabs.TabPane;

const collection_name = "gift-checks";

const form_data = {
  [collection_name]: [],
  _id: "",

  date: "",
  items: [],

  date_of_expiry: null,
  from_gc_no: "",
  to_gc_no: "",
  amount: "",

  prefix: "",

  errors: {},
};

class GiftChecks extends Component {
  state = {
    title: "Gift Checks",
    url: "/api/gift-checks/",
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
      .delete(this.state.url + this.state._id)
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

  onGiftCheckAdd = () => {
    let items = [...this.state.items];

    if (
      validator.isNumeric(this.state.from_gc_no) &&
      validator.isNumeric(this.state.to_gc_no)
    ) {
      for (let i = this.state.from_gc_no; i <= this.state.to_gc_no; i++) {
        items = [
          ...items,
          {
            gift_check_number:
              this.state.prefix + i.toString().padStart(4, "0"),
            amount: this.state.amount,
          },
        ];
      }
    } else {
      items = [
        ...items,
        {
          gift_check_number: this.state.from_gc_no,
          amount: this.state.amount,
        },
      ];
    }

    this.setState({
      items,

      from_gc_no: "",
      to_gc_no: "",
      //amount: "",
      errors: {},
    });
  };

  onDeleteGiftCheckItem = (record) => {
    const { items } = this.state;
    const index = items.indexOf(record);
    items.splice(index, 1);
    this.setState({
      items,
    });
  };

  render() {
    const gc_column = [
      {
        title: "GC #",
        dataIndex: "gift_check_number",
      },
      {
        title: "Amount",
        dataIndex: "amount",
        align: "right",
        render: (amount) => <span>{numberFormat(amount)}</span>,
      },
      /* {
        title: "Sold",
        dataIndex: "sold",
        render: (text, record, index) => (
          <span>
            {record.sold && (
              <div>
                SI# : {record.sold?.sale?.sales_id} <br />
                {moment(record.sold?.sale?.datetime).format("lll")}
              </div>
            )}
          </span>
        ),
      }, */
      {
        title: "Used",
        dataIndex: "used",
        render: (text, record, index) => (
          <span>
            {record?.used && (
              <div>
                Table# : {record?.used?.table?.name} <br />
                {moment(record?.used?.datetime).format("lll")}
              </div>
            )}
          </span>
        ),
      },
      {
        title: "Remarks",
        dataIndex: "remarks",
      },
      {
        title: "",
        width: 100,
        key: "action",
        render: (text, record, index) => (
          <Icon
            type="delete"
            theme="filled"
            className={classnames("pointer", {
              "display-none": !isEmpty(record.used),
            })}
            onClick={() => this.onDeleteGiftCheckItem(record, index)}
          />
        ),
      },
    ];

    const records_column = [
      {
        title: "Date",
        dataIndex: "date",
        render: (date) => <span>{moment(date).format("ll")}</span>,
      },
      {
        title: "GCs",
        dataIndex: "items",
        render: (items) => items.map((o) => o.gift_check_number).join(", "),
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
              <Breadcrumb.Item>Gift Checks</Breadcrumb.Item>
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
              <Tabs type="card">
                <TabPane tab="Gift Check Generation" key="1">
                  <div>
                    <TextFieldGroup
                      label="Prefix"
                      name="prefix"
                      value={this.state.prefix}
                      onChange={this.onChange}
                      error={errors.prefix}
                      formItemLayout={formItemLayout}
                      autoComplete="off"
                    />

                    <TextFieldGroup
                      label="From GC #"
                      name="from_gc_no"
                      value={this.state.from_gc_no}
                      onChange={this.onChange}
                      error={errors.from_gc_no}
                      formItemLayout={formItemLayout}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        this.onGiftCheckAdd();
                      }}
                      autoComplete="off"
                    />

                    <TextFieldGroup
                      label="To GC #"
                      name="to_gc_no"
                      value={this.state.to_gc_no}
                      onChange={this.onChange}
                      error={errors.to_gc_no}
                      formItemLayout={formItemLayout}
                    />

                    <TextFieldGroup
                      label="Amount"
                      name="amount"
                      value={this.state.amount}
                      onChange={this.onChange}
                      error={errors.amount}
                      formItemLayout={formItemLayout}
                    />

                    <Form.Item {...tailFormItemLayout}>
                      <div className="field is-grouped">
                        <div className="control">
                          <button className="button is-primary is-small">
                            Save
                          </button>
                        </div>
                        <div className="control">
                          <input
                            type="button"
                            className="button is-info is-small"
                            value="Add"
                            onClick={this.onGiftCheckAdd}
                          />
                        </div>

                        {!isEmpty(this.state._id)
                          ? this.state.items.filter((o) => !isEmpty(o?.used))
                              .length <= 0 && (
                              <span
                                className="button is-danger is-outlined is-small"
                                onClick={this.onDelete}
                              >
                                <span>Delete</span>
                                <span className="icon is-small">
                                  <i className="fas fa-times" />
                                </span>
                              </span>
                            )
                          : null}
                      </div>
                    </Form.Item>
                  </div>
                </TabPane>
                <TabPane tab="Gift Checks" key="2">
                  <Table
                    pagination={false}
                    dataSource={this.state.items}
                    columns={gc_column}
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

export default connect(mapToState)(GiftChecks);
