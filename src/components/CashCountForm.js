import React, { Component } from "react";
import { Form, Input, Modal, message, Row, Col } from "antd";
import axios from "axios";
import round from "../utils/round";
import numberFormat from "../utils/numberFormat";
import { sumBy } from "lodash";

let callback;

const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25];

const defaultState = {
  items: denominations.map((denomination) => ({
    denomination,
    quantity: null,
    amount: 0,
  })),
  total_amount: 0,
  user: null,
};

export default class CashCountForm extends Component {
  state = {
    ...defaultState,

    visible: false,
    errors: {},
  };

  open = (c, user) => {
    this.setState({ visible: true }, () => {});
    callback = c;
    this.setState({ user });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (
      this.state.items.filter((o) => o.amount <= 0).length ===
      this.state.items.length
    ) {
      message.error("Please supply cash denomination");
      return;
    }

    const { items, total_amount } = this.state;

    axios
      .put("/api/sales/cash-count", {
        items,
        total_amount: round(total_amount),
        user: this.state.user,
      })
      .then((response) => {
        if (response.data) {
          callback({ ...response.data });
        }
      })
      .catch((err) =>
        message.error("There was an error processing your request.")
      );

    this.setState({
      visible: false,
      ...defaultState,
    });
  };

  onChangeQuantityDenomination = ({ denomination, quantity, index }) => {
    const items = [...this.state.items];
    items[index] = {
      ...items[index],
      denomination,
      quantity,
      amount: round(denomination * quantity),
    };

    this.setState({ items });
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.items !== this.state.items) {
      let total_amount = round(sumBy(this.state.items, (o) => round(o.amount)));
      this.setState({ total_amount });
    }
  }

  render() {
    return (
      <div>
        <Modal
          title="Cash Denomination Slip"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => {
            this.setState({ visible: false });
            this.props.onCancel();
          }}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Row className="m-t-1" gutter={16}>
                <Col span={8} className="has-text-weight-bold">
                  Denomination
                </Col>
                <Col span={8} className="has-text-weight-bold">
                  Quantity
                </Col>
                <Col span={8} className="has-text-right has-text-weight-bold">
                  Amount
                </Col>
              </Row>
              {this.state.items.map((o, index) => (
                <Row key={index} className="m-t-1" gutter={16}>
                  <Col span={8}>{o.denomination}</Col>
                  <Col span={8}>
                    <Input
                      value={o.quantity}
                      onChange={(e) =>
                        this.onChangeQuantityDenomination({
                          denomination: o.denomination,
                          quantity: e.target.value,
                          index,
                        })
                      }
                    />
                  </Col>
                  <Col span={8} className="has-text-right">
                    {numberFormat(o.amount)}
                  </Col>
                </Row>
              ))}
              <Row className="m-t-1 b-t-3">
                <Col span={24} className="has-text-right has-text-weight-bold">
                  {numberFormat(this.state.total_amount)}
                </Col>
              </Row>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
