import React, { Component } from "react";
import { Form, Modal, message } from "antd";

import axios from "axios";

import { debounce } from "lodash";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import { formItemLayout } from "../../utils/Layouts";
import isEmpty from "../../validation/is-empty";

let callback;
export default class StockModal extends Component {
  state = {
    input: "",
    visible: false,
    stock: "",
    stock_options: [],
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
    this.onStockSearch = debounce(this.onStockSearch, 300);
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      setTimeout(() => {
        if (this.input_field.current) {
          this.input_field.current.focus();
        }
      }, 300);
    });

    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.stock)) {
      message.error("Field is empty");
      return;
    }

    callback(this.state.stock);
    this.setState({ visible: false, stock: "" });
  };

  /**
   * PRODUCT SELECT
   */

  onStockSearch = (value) => {
    this.getStocks(value).then((products) => {
      this.setState({
        stock_options: products,
      });
    });
  };

  getStocks = (value) => {
    return new Promise((resolve, reject) => {
      const loading = message.loading("Loading...");
      axios
        .get(`/api/products/listing/?s=${value}`)
        .then((response) => {
          loading();
          resolve(response.data);
        })
        .catch((err) => reject(err));
    });
  };

  onStockChange = (index) => {
    const stock = this.state.stock_options[index];
    this.setState({
      stock,
    });
  };

  /**
   * END PRODUCT SELECT
   */

  render() {
    return (
      <div>
        <Modal
          title={this.props.title}
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <SelectFieldGroup
                  label="Item"
                  name="stock"
                  value={this.state.stock && this.state.stock.name}
                  onChange={this.onStockChange}
                  onSearch={this.onStockSearch}
                  formItemLayout={formItemLayout}
                  data={this.state.stock_options}
                  inputRef={this.stockRef}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
