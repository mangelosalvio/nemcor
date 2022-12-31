import React, { Component } from "react";
import { Modal, message, Col, Row } from "antd";
import axios from "axios";
import { debounce } from "lodash";
import classnames from "classnames";
import WaiterAuthentication from "./WaiterAuthentication";

let callback;
export default class SelectWaiterModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
    waiters: [],
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
    this.waiterAuthentication = React.createRef();
    this.onSearchProduct = debounce(this.onSearchProduct, 300);
  }

  open = (c) => {
    axios
      .get("/api/waiters")
      .then((response) => {
        this.setState({ visible: true }, () => {
          this.setState({ waiters: response.data });
        });
      })
      .catch((err) => console.log(err));

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

  onWaiterSelect = (waiter) => {
    this.waiterAuthentication.current.open((authenticated_waiter) => {
      callback(authenticated_waiter);
      this.setState({
        waiters: [],
        visible: false,
      });
    }, waiter);
  };

  render() {
    return (
      <div>
        <WaiterAuthentication ref={this.waiterAuthentication} />
        <Modal
          title="Select Waiter"
          visible={this.state.visible}
          footer={null}
          width={1024}
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
                <div className="is-flex flex-wrap">
                  {this.state.waiters.map((waiter) => (
                    <div
                      onClick={() => this.onWaiterSelect(waiter)}
                      key={waiter._id}
                      className={classnames(
                        "waiter-container  has-background-success has-text-weight-bold"
                      )}
                    >
                      {waiter.name}
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
