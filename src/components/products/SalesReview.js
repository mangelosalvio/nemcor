import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import "../../styles/Autosuggest.css";

import { Layout, Table, message, List, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import ReactToPrint from "react-to-print";
import ReportHeading from "../../utils/ReportHeading";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";

const { Content } = Layout;

const collection_name = "products";
let categories = [];
const form_data = {
  [collection_name]: [],
  _id: "",
  name: "",
  price: "",
  category: [],
  errors: {},
};

class SalesReview extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    from_datetime: null,
    to_datetime: null,
    category_options: [],
    records: [],
    loading: false,
  };

  componentDidMount() {
    let authenticate = this.props.other_set
      ? authenticateOwner
      : authenticateAdmin;

    authenticate({
      role: this.props.auth.user?.role,
      history: this.props.history,
    });

    this.getReport();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.other_set !== prevProps.other_set) {
      this.getReport();
    }
  }

  getReport = () => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
          other_set: this.props.other_set || false,
        };
        axios
          .post(`/api/inventories/sales-inventory`, form_data)
          .then((response) =>
            this.setState({
              records: response.data.records,
              from_datetime: moment(response.data.from_datetime),
              to_datetime: moment(response.data.to_datetime),
              loading: false,
            })
          );
      }
    );
  };

  getCategory = (category) => {
    const children = categories.filter((c) => {
      return c.parent_category && c.parent_category._id === category._id;
    });

    const has_children = children.length > 0;

    return {
      label: category.name,
      value: category._id,
      isLeaf: !has_children,
      children: has_children ? children.map(this.getCategory) : undefined,
    };
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const form_data = {
      ...this.state,
      user: this.props.auth.user,
    };
    const loading = message.loading("Loading...", 0);

    if (isEmpty(this.state._id)) {
      axios
        .put(this.state.url, form_data)
        .then(({ data }) => {
          loading();
          message.success("Transaction Saved");
          this.setState({
            ...data,
            errors: {},
            message: "Transaction Saved",
          });
        })
        .catch((err) => {
          loading();
          message.error("You have an invalid input");
          this.setState({ errors: err.response.data });
        });
    } else {
      axios
        .post(this.state.url + this.state._id, form_data)
        .then(({ data }) => {
          loading();
          message.success("Transaction Updated");
          this.setState({
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
    const loading = message.loading("Loading...", 0);
    axios
      .get(this.state.url + "?s=" + this.state.search_keyword)
      .then((response) => {
        loading();
        this.setState({
          [collection_name]: response.data,
          message: isEmpty(response.data) ? "No rows found" : "",
        });
      })
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

  onLoadCategoryData = (selectedOptions) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    targetOption.children = categories
      .filter((category) => {
        return (
          category.parent_category &&
          category.parent_category._id === targetOption.value
        );
      })
      .map((category) => {
        const has_children =
          categories.filter((c) => {
            return c.parent_category && c.parent_category._id === category._id;
          }).length > 0;

        return {
          label: category.name,
          value: category._id,
          isLeaf: !has_children,
        };
      });
    this.setState({
      category_options: [...this.state.category_options],
    });
  };

  onCategoryChange = (value, selectedOptions) => {
    this.setState({ category: value });
  };

  render() {
    const records_column = [
      {
        title: "Item",
        dataIndex: "product.name",
      },
      {
        title: "Sales",
        dataIndex: "quantity",
        align: "right",
        width: "7%",
      },
    ];

    const { errors } = this.state;

    const records = (this.state.records || []).map((record, record_index) => {
      const items = (record.items || []).map((item, item_index) => {
        return {
          ...item,
          key: item_index,
        };
      });

      return {
        ...record,
        key: record_index,
        items,
      };
    });

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Items Sold By Category</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              Items Sold By Category
            </span>
          </div>
          <hr />
          <div>
            <RangeDatePickerFieldGroup
              label="Period Covered"
              name="period_covered"
              value={this.state.period_covered}
              onChange={(dates) =>
                this.setState({ period_covered: dates }, this.getReport)
              }
              error={errors.period_covered}
              formItemLayout={formItemLayout}
            />

            <Form.Item {...tailFormItemLayout}>
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" shape="round">
                    Print
                  </Button>
                )}
                bodyClass="print"
                content={() => this.report}
              />
            </Form.Item>
          </div>
          <div ref={(el) => (this.report = el)}>
            <div className="report-heading">
              <ReportHeading />
              <span className="has-text-weight-bold">
                Items Sold By Category Report
              </span>
              <br />
              {this.state.from_datetime &&
                this.state.to_datetime &&
                `${this.state.from_datetime.format(
                  "lll"
                )} - ${this.state.to_datetime.format("lll")} `}{" "}
              <br />
              Printed By : {this.props.auth.user.name} <br />
              Date/Time Printed : {moment().format("LLL")}
            </div>
            <List
              bordered
              itemLayout="vertical"
              dataSource={records}
              loading={this.state.loading}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span
                        className="has-text-weight-bold"
                        style={{ fontSize: "12px" }}
                      >
                        {moment(item.datetime).format("LL")}/{" "}
                        {item.category.name}
                      </span>
                    }
                  />
                  <div style={{ paddingLeft: "1rem" }}>
                    <Table
                      size="small"
                      dataSource={item.items}
                      columns={records_column}
                      pagination={false}
                      rowClassName={(record, index) => {
                        if (record.variance < 0) {
                          return "has-background-danger has-text-light has-text-weight-bold";
                        }
                      }}
                    />
                  </div>
                </List.Item>
              )}
            />
          </div>
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

export default connect(mapToState)(SalesReview);
