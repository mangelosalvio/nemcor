import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import "../../styles/Autosuggest.css";
import ReactToPrint from "react-to-print";

import { Layout, Table, message, List, Button, Form, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";

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

class InventoryReview extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    category_options: [],
    records: [],
    loading: false,
  };

  componentDidMount() {
    this.getInventory();
  }

  getInventory = () => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
        };
        axios
          .post(`/api/inventories/current`, form_data)
          .then((response) =>
            this.setState({ records: response.data, loading: false })
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
        title: "Beg Bal",
        dataIndex: "beg_bal",
        align: "right",
        width: "7%",
      },
      {
        title: "In",
        dataIndex: "product_ins",
        align: "right",
        width: "7%",
      },
      {
        title: "Orders",
        dataIndex: "orders",
        align: "right",
        width: "7%",
      },
      {
        title: "Sales",
        dataIndex: "sales",
        align: "right",
        width: "7%",
      },
      {
        title: "End Bal",
        dataIndex: "end_bal",
        align: "right",
        width: "7%",
      },
      {
        title: "Com Bal",
        dataIndex: "computed_bal",
        align: "right",
        width: "7%",
      },
      {
        title: "Variance",
        dataIndex: "variance",
        align: "right",
        width: "7%",
      },
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Inventory Review</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              INVENTORY REVIEW
            </span>
          </div>
          <hr />

          <RangeDatePickerFieldGroup
            label="Period Covered"
            name="period_covered"
            value={this.state.period_covered}
            onChange={(dates) =>
              this.setState({ period_covered: dates }, this.getInventory)
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

          <div ref={(el) => (this.report = el)}>
            <div className="has-text-centered report-heading">
              Inventory Report <br />
              {this.state.period_covered[0] &&
                this.state.period_covered[1] &&
                `${moment(this.state.period_covered[0]).format(
                  "ll"
                )} - ${moment(this.state.period_covered[1]).format(
                  "ll"
                )} `}{" "}
            </div>
            <List
              bordered
              itemLayout="vertical"
              dataSource={this.state.records}
              loading={this.state.loading}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span className="has-text-weight-bold">
                        {moment(item.date).format("LL")}/ {item.category.name}
                      </span>
                    }
                  />
                  <div style={{ paddingLeft: "1rem" }}>
                    <Table
                      size="small"
                      dataSource={item.items}
                      columns={records_column}
                      rowKey={(item) => item._id}
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

export default connect(mapToState)(InventoryReview);
