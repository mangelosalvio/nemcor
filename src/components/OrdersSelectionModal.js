import React, { Component } from "react";
import { Modal, message, Button, Row, Col } from "antd";
import axios from "axios";
import moment from "moment";

export default class OrdersSelectionModal extends Component {
  state = {
    account: "",
    visible: false,
    options: {
      accounts: [],
    },
    errors: {},
    orders: [],
    table: "",
  };

  constructor(props) {
    super(props);
    this.accountBillingField = React.createRef();
  }

  open = (c, { orders, table }) => {
    this.setState({ visible: true, orders, table });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onClose = () => {
    this.setState({
      visible: false,
    });
  };

  onReprint = (order) => {
    const form_data = {
      order,
      table: this.state.table,
    };

    axios.post(`/api/tables/reprint-order`, form_data).then(() => {
      message.success("Order reprinted");
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Reprint Order"
          visible={this.state.visible}
          footer={[
            <Button key="submit" type="primary" onClick={this.onClose}>
              Close
            </Button>,
          ]}
          closable={true}
        >
          <div>
            {this.state.orders.map((order, index) => (
              <Row key={index}>
                <Col style={{ margin: "8px 0px" }}>
                  <Button
                    style={{
                      padding: "36px",
                      width: "100%",
                      lineHeight: "0px",
                    }}
                    onClick={() => this.onReprint(order)}
                  >
                    OS#{order.order_id} / {moment(order.datetime).format("lll")}{" "}
                    {order.user && order.user.name && ` / ${order.user.name}`}
                  </Button>
                </Col>
              </Row>
            ))}
          </div>
        </Modal>
      </div>
    );
  }
}
