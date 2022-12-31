import React, { Component } from "react";
import { Modal, message, Col, Row, Input } from "antd";
import isEmpty from "../validation/is-empty";
import axios from "axios";
import { debounce } from "lodash";
import classnames from "classnames";

let callback;
export default class SearchSuspendedSalesModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
    suspended_sales: [],
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true, input: "" }, () => {
      setTimeout(() => {
        if (this.input_field.current) {
          this.input_field.current.focus();
        }
      }, 300);
    });

    /* axios
      .get("/api/sales/suspended-sales")
      .then((response) => {
        this.setState({ visible: true }, () => {
          this.setState({ suspended_sales: response.data });
        });
      })
      .catch((err) => console.log(err)); */

    callback = c;
  };

  /* onTableSelect = (sale) => {
    this.props.onSelect({ sale });
    this.setState({
      suspended_sales: [],
      visible: false,
    });
  }; */

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  render() {
    return (
      <div>
        <Modal
          title="Select Suspended Sale"
          visible={this.state.visible}
          footer={null}
          width={800}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
        >
          <div>
            <div>
              <Input
                autoComplete="off"
                name="input"
                value={this.state.input}
                onChange={this.onChange}
                ref={this.input_field}
                onPressEnter={(e) => {
                  axios
                    .get(
                      `/api/sales/${this.state.input}/suspended-sale-reference`
                    )
                    .then((response) => {
                      if (response.data) {
                        this.props.onSelect({ sale: response.data });
                        this.setState({
                          visible: false,
                          input: "",
                        });
                      } else {
                        message.error("No reference found");
                      }
                    });
                }}
              />
            </div>
            {/* <Row>
              <Col>
                <div className="columns is-multiline">
                  {this.state.suspended_sales.map((table) => (
                    <div
                      onClick={() => this.onTableSelect(table)}
                      key={table._id}
                      className={classnames(
                        "column TableNumber--table-number is-3"
                      )}
                    >
                      {table?.customer?.customer_name}
                    </div>
                  ))}
                </div>
              </Col>
            </Row> */}
          </div>
        </Modal>
      </div>
    );
  }
}
