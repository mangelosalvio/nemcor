import React, { Component } from "react";
import { connect } from "react-redux";
import TextFieldGroup from "../../commons/TextFieldGroup";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import MessageBoxInfo from "../../commons/MessageBoxInfo";
import Searchbar from "../../commons/Searchbar";
import "../../styles/Autosuggest.css";
import moment from "moment-timezone";
import { Layout, Breadcrumb, Form, Table, Icon, message } from "antd";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";

const Content = Layout.Content;

const collection_name = "raw_ins";

const form_data = {
  [collection_name]: [],

  _id: "",
  date: "",

  raw_materials: [],
  raw_material_quantity: "",
  product: "",
};

class BegBalanceForm extends Component {
  state = {
    title: "Beginning Balance Form",
    url: "/api/beg-balance/",
    search_keyword: "",
    errors: {},
    ...form_data,
    product_options: [],
  };

  constructor(props) {
    super(props);
    this.productRef = React.createRef();
    this.quantityRef = React.createRef();
  }

  componentDidMount() {
    this.getCurrentBegBalance();
  }

  getCurrentBegBalance = () => {
    axios.get(`${this.state.url}current`).then((response) => {
      if (response.data) {
        this.setState({
          ...response.data,
        });
      }
    });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };
  onRawMaterialAdd = (e) => {
    e.preventDefault();

    if (
      isEmpty(this.state.product) ||
      isEmpty(this.state.raw_material_quantity)
    ) {
      message.error("Please fill supply product and quantity");
      return;
    }

    const raw_materials = [
      {
        raw_material: this.state.product,
        raw_material_quantity: this.state.raw_material_quantity,
      },
      ...this.state.raw_materials,
    ];

    this.setState({
      raw_materials,
      product: "",
      raw_material_quantity: "",
    });
    this.productRef.current.focus();
  };

  onDeleteRawMaterial = (index) => {
    const raw_materials = [...this.state.raw_materials];
    raw_materials.splice(index, 1);
    this.setState({ raw_materials });
  };

  /**
   * END RAW MATERIALS AUTOSUGGEST
   */

  onSubmit = (e) => {
    e.preventDefault();
    const loading = message.loading("Processing...");

    const form_data = {
      ...this.state,
      user: this.props.auth.user,
    };

    if (isEmpty(this.state._id)) {
      axios
        .put(this.state.url, form_data)
        .then(({ data }) => {
          this.setState({
            ...data,
            errors: {},
            message: "Transaction Saved",
          });
          loading();
        })
        .catch((err) => this.setState({ errors: err.response.data }));
    } else {
      axios
        .post(this.state.url + this.state._id, form_data)
        .then(({ data }) => {
          this.setState({
            ...data,
            errors: {},
            message: "Transaction Updated",
          });
          loading();
        })
        .catch((err) => {
          this.setState({ errors: err.response.data });
          loading();
        });
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
    this.setState(
      {
        ...form_data,
      },
      () => {
        this.getCurrentBegBalance();
        this.productRef.current.focus();
      }
    );
  };

  edit = (record) => {
    axios
      .get(this.state.url + record._id)
      .then((response) => {
        this.setState({
          [collection_name]: [],
          ...response.data,
        });
      })
      .catch((err) => console.log(err));
  };

  onDelete = () => {
    const loading = message.loading("Processing...");

    axios
      .delete(this.state.url + this.state._id, {
        data: {
          user: this.props.auth.user,
        },
      })
      .then((response) => {
        loading();
        this.setState({
          ...form_data,
        });
        message.success("Transaction Deleted");
      })
      .catch((err) => console.log(err));
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  onProductSearch = (value) => {
    this.setState({ is_loading_products: true });
    axios
      .get(`/api/products/listing/?s=${value}`)
      .then((response) =>
        this.setState({
          product_options: response.data,
        })
      )
      .catch((err) => console.log(err));
  };

  onProductChange = (value) => {
    this.setState((prevState) => {
      return {
        product: prevState.product_options[value],
      };
    });
    this.quantityRef.current.focus();
  };

  render() {
    const raw_materials_column = [
      {
        title: "Raw Material",
        dataIndex: "raw_material.name",
      },
      {
        title: "Qty",
        dataIndex: "raw_material_quantity",
        align: "right",
      },
      {
        title: "",
        key: "action",
        width: 100,
        render: (text, record, index) => (
          <span>
            <Icon
              type="delete"
              theme="filled"
              className="pointer"
              onClick={() => this.onDeleteRawMaterial(index)}
            />
          </span>
        ),
      },
    ];

    const records_column = [
      {
        title: "Beg Bal #",
        dataIndex: "beg_balance_id",
      },
      {
        title: "Date",
        dataIndex: "date",
        render: (date) => <span>{moment(date).format("lll")}</span>,
      },
      {
        title: "Log",
        dataIndex: "logs",
        render: (logs, record) => (
          <span className="record-log">{logs[logs.length - 1].log}</span>
        ),
      },
      {
        title: "",
        key: "action",
        width: 20,
        render: (text, record, index) => (
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
              <Breadcrumb.Item>Beginning Balance</Breadcrumb.Item>
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
              <div>
                <SelectFieldGroup
                  label="Product"
                  name="product"
                  value={this.state.product && this.state.product.name}
                  onChange={this.onProductChange}
                  onSearch={this.onProductSearch}
                  error={errors.product}
                  formItemLayout={formItemLayout}
                  data={this.state.product_options}
                  autoFocus={true}
                  inputRef={this.productRef}
                />

                <TextFieldGroup
                  type="number"
                  label="Quantity"
                  name="raw_material_quantity"
                  value={this.state.raw_material_quantity}
                  error={errors.raw_material_quantity}
                  formItemLayout={formItemLayout}
                  onChange={this.onChange}
                  inputRef={this.quantityRef}
                />

                <Form.Item className="m-t-1" {...tailFormItemLayout}>
                  <div className="field is-grouped">
                    <div className="control">
                      <button
                        className="button is-small is-primary"
                        onClick={this.onRawMaterialAdd}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </Form.Item>

                <div>
                  <Table
                    dataSource={this.state.raw_materials}
                    columns={raw_materials_column}
                    rowKey="_id"
                    pagination={false}
                  />
                </div>

                <div className="buttons field is-grouped m-t-1">
                  <div className="control">
                    <button className="button is-small is-primary">Save</button>
                  </div>

                  {!isEmpty(this.state._id) ? (
                    <span
                      className="button is-danger is-small is-outlined"
                      onClick={this.onDelete}
                    >
                      <span>Delete</span>
                      <span className="icon is-small">
                        <i className="fas fa-times" />
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            </Form>
          ) : (
            <Table
              dataSource={this.state[collection_name]}
              columns={records_column}
              rowKey="_id"
            />
          )}
        </div>
      </Content>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    auth: state.auth,
  };
};

export default connect(mapStateToProps)(BegBalanceForm);
