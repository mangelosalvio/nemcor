import React, { Component } from "react";
import { Modal, message, Col, Row } from "antd";
import isEmpty from "../validation/is-empty";
import axios from "axios";
import { debounce } from "lodash";
import classnames from "classnames";

let callback;
export default class SearchTableModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
    tables: [],
    suspended_sales: [],
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
    this.onSearchProduct = debounce(this.onSearchProduct, 300);
  }

  open = c => {
    axios
      .get("/api/sales/suspended-sales")
      .then((response) => {
        this.setState({ visible: true }, () => {
          this.setState({ suspended_sales: response.data });
        });
      })
      .catch((err) => console.log(err));
      
    axios
      .get("/api/tables")
      .then(response => {
        this.setState({ visible: true }, () => {
          this.setState({ tables: response.data });
        });
      })
      .catch(err => console.log(err));

    callback = c;
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value }, () => {
      this.onSearchProduct();
    });
  };

  onSearchProduct = () => {
    const loading = message.loading("Loading...");
    const form_data = {
      name: this.state.input
    };

    axios
      .post("/api/products/name", form_data)
      .then(({ data }) => {
        loading();
        this.setState({ items: data, selected_item_index: 0 }, () => {});
      })
      .catch(err => {
        loading();
        message.error("There was an error processing your request");
      });
  };

  onKeyDown = e => {
    if (e.key === "Escape") {
      this.setState({
        visible: false,
        input: ""
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
        selected_item_index: value
      },
      () => {
        const el = document.getElementsByClassName(
          `search-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest"
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
        selected_item_index: value
      },
      () => {
        const el = document.getElementsByClassName(
          `search-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest"
          });
        }
      }
    );
  };

  onTableSelect = table => {
    if (isEmpty(table.orders)) {
      message.error("No Orders to process");
      return;
    } else {
      this.props.onSearchTableSelect({ table });
      this.setState({
        tables: [],
        visible: false
      });
    }
  };

  onSuspendedSaleSelect = (sale) => {
    this.props.onSelect({ sale });
    this.setState({
      suspended_sales: [],
      visible: false,
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Select Table"
          visible={this.state.visible}
          footer={null}
          width={'95%'}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
        >
          <div>
            <Row>
              <Col>
                <div className="columns is-multiline">
                  {this.state.tables.map(table => (
                    <div
                      onClick={() => this.onTableSelect(table)}
                      key={table._id}
                      className={classnames(
                        "column TableNumber--table-number is-1",
                        {
                          "has-background-success": isEmpty(table.orders),
                          "has-background-danger": !isEmpty(table.orders)
                        }
                      )}
                    >
                      {table.name}
                    </div>
                  ))}

                  {this.state.suspended_sales.map((table) => (
                    <div
                      onClick={() => this.onSuspendedSaleSelect(table)}
                      key={table._id}
                      className={classnames(
                        "column TableNumber--table-number is-1"
                      )}
                    >
                      {table?.customer?.customer_name}
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </div>
        </Modal>
      </div>
    );
  }
}
