import React, { Component } from "react";
import { Input, Modal, message, Table } from "antd";
import numberFormat from "../utils/numberFormat";
import axios from "axios";
import { debounce } from "lodash";
import isEmpty from "../validation/is-empty";

let callback;
export default class SearchProductModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
    this.onSearchProduct = debounce(this.onSearchProduct, 300);
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
    this.setState({ [e.target.name]: e.target.value }, () => {
      this.onSearchProduct();
    });
  };

  onSearchProduct = () => {
    const loading = message.loading("Loading...");
    const form_data = {
      name: this.state.input,
    };

    axios
      .post("/api/products/name", form_data)
      .then(({ data }) => {
        loading();
        this.setState({ items: data, selected_item_index: 0 }, () => {});
      })
      .catch((err) => {
        loading();
        message.error("There was an error processing your request");
      });
  };

  onKeyDown = (e) => {
    if (e.key === "Escape") {
      this.setState({
        visible: false,
        input: "",
      });
      callback();
    } else if (e.key === "ArrowUp") {
      this.onArrowUp();
    } else if (e.key === "ArrowDown") {
      this.onArrowDown();
    }
  };

  onArrowUp = () => {
    let value = this.state.selected_item_index - 1;
    value = value < 0 ? 0 : value;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `search-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    );
  };

  onArrowDown = () => {
    let value = this.state.selected_item_index + 1;
    value =
      value > this.state.items.length - 1 ? this.state.items.length - 1 : value;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `search-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    );
  };

  onRowSelected = (index) => {
    this.setState(
      {
        selected_item_index: index,
      },
      () => {
        const el = document.getElementsByClassName(
          `search-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    );
  };

  onSelectProduct = () => {
    if (this.state.items.length > 0) {
      this.setState({
        input: "",
        visible: false,
      });
      this.props.onSearchProductSelect({
        item: this.state.items[this.state.selected_item_index],
      });
    }
  };

  render() {
    const records_column = [
      {
        title: "ITEM",
        dataIndex: "name",
      },
      {
        title: "SKU",
        dataIndex: "sku",
      },
      {
        title: "PRICE",
        dataIndex: "price",
        align: "right",
        render: (value, record) => numberFormat(value),
        width: 150,
      },
      {
        title: "WHOLESALE",
        dataIndex: "wholesale_price",
        align: "right",
        render: (value, record) => numberFormat(value),
        width: 150,
      },
    ];

    return (
      <div>
        <Modal
          title="Search Product"
          visible={this.state.visible}
          footer={null}
          width={700}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
        >
          <div>
            <Input
              name="input"
              placeholder={this.props.placeholder}
              value={this.state.input}
              onChange={this.onChange}
              autoFocus={true}
              ref={this.input_field}
              onKeyDown={this.onKeyDown}
              autoComplete="off"
              onPressEnter={this.onSelectProduct}
            />
            <Table
              dataSource={this.state.items}
              columns={records_column}
              rowKey={(record) => record._id}
              scroll={{ y: 351 }}
              pagination={false}
              rowClassName={(record, index) => {
                if (this.state.selected_item_index === index) {
                  return `is-item-selected search-item-row-${index}`;
                }
                return `search-item-row-${index}`;
              }}
              onRow={(record, rowIndex) => {
                return {
                  onClick: (event) => {
                    this.onRowSelected(rowIndex);
                  },
                  onDoubleClick: (event) => {
                    this.setState({
                      input: "",
                      visible: false,
                    });
                    this.props.onSearchProductSelect({
                      item: this.state.items[rowIndex],
                    });
                  },
                };
              }}
            />
          </div>
        </Modal>
      </div>
    );
  }
}
