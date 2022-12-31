import React, { Component } from "react";
import { connect } from "react-redux";

import axios from "axios";

import MessageBoxInfo from "../../commons/MessageBoxInfo";

import "../../styles/Autosuggest.css";

import { Layout, Breadcrumb, Table, message, List } from "antd";

import { EditableFormRow, EditableCell } from "../../commons/Editable";

const { Content } = Layout;

const collection_name = "products";

const form_data = {
  [collection_name]: [],
  categories: [],
  errors: {}
};

class CategoryProducts extends Component {
  state = {
    title: "Category Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    options: {
      research_categories: [],
      research_agendas: []
    },
    raw_material_options: [],
    category_options: [],
    add_on_options: []
  };

  constructor(props) {
    super(props);
    this.add_on_field = React.createRef();
    this.alternative_field = React.createRef();
  }

  componentDidMount() {
    const loading = message.loading("Loading...");
    axios.post("/api/categories/products").then(response => {
      loading();
      this.setState({
        categories: response.data
      });
    });
  }

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onObjectChange = (object, e) => {
    this.setState({
      [object]: {
        ...this.state[object],
        [e.target.name]: e.target.value
      }
    });
  };

  handleSave = record => {
    const categories = [...this.state.categories];
    const category_index = categories.findIndex(
      category => category._id === record.category._id
    );
    const products = [...categories[category_index].products];

    const product_index = products.findIndex(
      product => product._id === record._id
    );

    const product = products[product_index];

    categories[category_index].products[product_index].price = record.price;
    const form_data = {
      price: record.price
    };

    const loading = message.loading("Processing...");
    axios
      .post(`/api/products/${product._id}/price`, form_data)
      .then(response => {
        loading();
        message.success("Successufully updated price");
        this.setState({ categories });
      });
  };

  render() {
    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell
      }
    };

    let records_column = [
      {
        title: "Product",
        dataIndex: "name"
      },

      {
        title: "Raw Materials",
        dataIndex: "raw_materials",
        width: 200,
        render: (text, record, index) => {
          const p = record.raw_materials
            ? record.raw_materials.map(
                o => `${o.raw_material.name}(${o.raw_material_quantity})`
              )
            : [];
          return <span>{p.join(", ")}</span>;
        }
      },

      {
        title: "Add-ons",
        dataIndex: "add_ons",
        width: 200,
        render: (text, record, index) => {
          const p = record.add_ons
            ? record.add_ons.map(o => `${o.product.name}`)
            : [];
          return <span>{p.join(", ")}</span>;
        }
      },

      {
        title: "Price",
        dataIndex: "price",
        width: 100,
        editable: true
      }
    ];

    records_column = records_column.map(col => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave
        })
      };
    });

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Home</Breadcrumb.Item>
              <Breadcrumb.Item>Products</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>

        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <span className="is-size-5">{this.state.title}</span> <hr />
          <MessageBoxInfo message={this.state.message} onHide={this.onHide} />
          <List
            itemLayout="vertical"
            size="large"
            dataSource={this.state.categories}
            renderItem={category => (
              <List.Item key={category._id}>
                <List.Item.Meta title={category.name} />
                <div style={{ padding: "8px 32px" }}>
                  <Table
                    components={components}
                    dataSource={category.products}
                    columns={records_column}
                    rowKey={record => record._id}
                    pagination={false}
                  />
                </div>
              </List.Item>
            )}
          />
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

export default connect(mapToState)(CategoryProducts);
