import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import "../../styles/Autosuggest.css";
import { debounce } from "lodash";
import { Layout, Form, message, Breadcrumb } from "antd";
import { formItemLayout } from "./../../utils/Layouts";

import numeral from "numeral";
import round from "../../utils/round";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const collection_name = "inventories";
const form_data = {
  [collection_name]: [],
  _id: "",
  date: null,
  branch: "",
  items: [],
  errors: {}
};

class InventoryEntryForm extends Component {
  state = {
    title: "Branch Inventory",
    url: "/api/inventories/",
    search_keyword: "",
    ...form_data,
    branches: [],
    category_products: [],
    category_options: [],
    category: []
  };

  constructor(props) {
    super(props);
    this.updateInventory = debounce(this.updateInventory, 300);
  }

  componentDidMount() {
    const form_data = {
      user: this.props.auth.user
    };

    axios
      .post(`/api/inventories/entry`, form_data)
      .then(response => {
        if (response) {
          const record = response.data;
          if (record) {
            this.setState(prevState => {
              return {
                ...form_data,
                ...record,
                date: record.date ? moment(record.date) : null,
                errors: {}
              };
            });
          }
        }
      })
      .catch(err => console.log(err));
  }

  getProducts = () => {
    return new Promise((resolve, reject) => {
      axios
        .get(`/api/products`)
        .then(response => {
          resolve(response.data);
        })
        .catch(err => reject(err));
    });
  };

  getCategories = () => {
    axios.get(`/api/categories`).then(response => {
      this.setState({ category_options: response.data });
    });
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  inventoryValue = ({ product, type }) => {
    const items = [...this.state.items];
    const item = items.find(
      item => item.product && item.product._id === product._id
    );
    if (!isEmpty(item)) {
      return item[type];
    }
  };

  onInventoryChange = (e, index) => {
    let items = [...this.state.items];
    let item = { ...items[index] };
    item[e.target.name] = e.target.value;
    item = this.computeBalance(item);
    items[index] = item;

    const form_data = {
      ...item,
      user: this.props.auth.user
    };

    this.updateInventory(form_data);

    this.setState({ items });
  };

  updateInventory = form_data => {
    const loading = message.loading("Loading...", 0);
    axios
      .put("/api/inventories/entry", form_data)
      .then(response => loading())
      .catch(err => console.log(err));
  };

  computeBalance = item => {
    const total = numeral(0);
    if (!isEmpty(item.beg_bal)) total.add(item.beg_bal);
    if (!isEmpty(item.in)) total.add(item.in);
    if (!isEmpty(item.orders)) total.subtract(item.orders);
    if (!isEmpty(item.sales)) total.subtract(item.sales);

    const computed_bal = total.value();

    const end_bal = !isEmpty(item.end_bal) ? item.end_bal : 0;
    const variance = round(end_bal - computed_bal);
    return {
      ...item,
      computed_bal,
      variance
    };
  };

  onSubmit = e => {
    e.preventDefault();

    const form_data = {
      ...this.state,
      user: this.props.auth.user
    };
    const loading = message.loading("Loading...", 0);

    axios
      .put(`/api/inventories/entry`, form_data)
      .then(({ data }) => {
        loading();
        message.success("Transaction Saved");
        this.setState({
          ...data,
          date: data.date ? moment(data.date) : null,
          errors: {},
          message: "Transaction Saved"
        });
      })
      .catch(err => {
        console.log(err);
      });
  };

  onSearch = (value, e) => {
    e.preventDefault();
    const loading = message.loading("Loading...", 0);
    axios
      .get(this.state.url + "?s=" + this.state.search_keyword)
      .then(response => {
        loading();
        this.setState({
          [collection_name]: response.data,
          message: isEmpty(response.data) ? "No rows found" : ""
        });
      })
      .catch(err => console.log(err));
  };

  addNew = () => {
    this.setState({
      ...form_data,
      errors: {},
      message: ""
    });
  };

  edit = record => {
    axios
      .get(this.state.url + record._id)
      .then(response => {
        const record = response.data;
        this.setState(prevState => {
          return {
            ...form_data,
            [collection_name]: [],
            ...record,
            date: record.date ? moment(record.date) : null,
            errors: {}
          };
        });
      })
      .catch(err => console.log(err));
  };

  onDelete = () => {
    axios
      .delete(this.state.url + this.state._id, {
        data: {
          user: this.props.auth.user
        }
      })
      .then(response => {
        message.success("Transaction Deleted");
        this.setState({
          ...form_data,
          message: "Transaction Deleted"
        });
      })
      .catch(err => {
        message.error(err.response.data.message);
      });
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  onCategorySearch = value => {
    axios
      .get(`/api/categories/?s=${value}`)
      .then(response => this.setState({ category_options: response.data }))
      .catch(err => console.log(err));
  };

  onCategoryChange = index => {
    const category = this.state.category_options[index];

    this.setState({ category });

    const loading = message.loading("Loading...", 0);

    const form_data = {
      category: category,
      user: this.props.auth.user
    };

    axios
      .post(`/api/inventories/current-entry`, form_data)
      .then(response => {
        const entries = [...response.data.entries];

        const items = response.data.items.map(product => {
          const entry = entries.find(e => e.product._id === product._id);

          if (entry === undefined) {
            /**
             * no entry
             */

            /**
             * get previous ending balance and forward to beginning balance
             */

            return {
              product,
              beg_bal: 0,
              in: 0,
              orders: 0,
              sales: 0,
              end_bal: 0,
              computed_bal: "",
              variance: ""
            };
          } else {
            return {
              product,
              beg_bal: entry.beg_bal || 0,
              in: entry.product_ins || 0,
              orders: entry.orders || 0,
              sales: entry.sales || 0,
              end_bal: entry.end_bal || 0,
              computed_bal: entry.computed_bal || 0,
              variance: entry.variance || 0
            };
          }
        });
        this.setState({ items });
        loading();
      })
      .catch(err => console.log(err));
  };

  filterBranch = (input, option) => {
    return (
      option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
    );
  };

  render() {
    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Review</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>

        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <span className="is-size-5">{moment().format("LL")} </span> <hr />
          <Form onSubmit={this.onSubmit}>
            <SelectFieldGroup
              label="Category"
              name="category"
              value={this.state.category && this.state.category.name}
              onChange={this.onCategoryChange}
              onSearch={this.onCategorySearch}
              error={errors.category && errors.category.name}
              formItemLayout={formItemLayout}
              data={this.state.category_options}
            />
            <div style={{ marginTop: "32px" }}>
              <table className="table full-width is-narrow is-bordered is-striped is-hoverable">
                <thead>
                  <tr>
                    <th className="inventory-input has-text-center">BEG</th>
                    <th className="inventory-input has-text-center">IN</th>
                    <th className="inventory-input has-text-center">ORDERS</th>
                    <th className="inventory-input has-text-center">SALES</th>
                    <th className="inventory-input has-text-center">END BAL</th>
                    <th className="inventory-input has-text-center">
                      COMP BAL
                    </th>
                    <th className="inventory-input has-text-center">VAR</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.items.map((item, index) => {
                    return [
                      <tr key={`${item.product._id}1`}>
                        <td colSpan="10">{item.product.name}</td>
                      </tr>,
                      <tr key={`${item.product._id}2`}>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            name="beg_bal"
                            onChange={event =>
                              this.onInventoryChange(event, index)
                            }
                            value={item.beg_bal}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            name="in"
                            onChange={event =>
                              this.onInventoryChange(event, index)
                            }
                            value={item.in}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            name="orders"
                            value={item.orders}
                            onChange={event =>
                              this.onInventoryChange(event, index)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            name="sales"
                            value={item.sales}
                            onChange={event =>
                              this.onInventoryChange(event, index)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            name="end_bal"
                            onChange={event =>
                              this.onInventoryChange(event, index)
                            }
                            value={item.end_bal}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            readOnly
                            value={item.computed_bal}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="inv-input"
                            readOnly
                            value={item.variance}
                          />
                        </td>
                      </tr>
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </Form>
        </div>
      </Content>
    );
  }
}

const mapToState = state => {
  return {
    auth: state.auth
  };
};

export default connect(mapToState)(InventoryEntryForm);
