import React, { Component } from "react";
import { Form, Input, Modal, Row, Button, Col, Radio } from "antd";
import axios from "axios";
import numberFormat from "./../utils/numberFormat";
import round from "../utils/round";
import numeral from "numeral";
import isEmpty from "./../validation/is-empty";

let callback;
export default class ProductOrderForm extends Component {
  state = {
    product: {
      product_options: [],
      product_option: "",
    },
    tieup_information: null,
    visible: false,
    errors: {},
  };

  open = ({ c, product, tieup_information }) => {
    const newProduct = { ...product };
    newProduct.orig_price = newProduct.price;

    newProduct.add_ons = newProduct.add_ons.map((o) => {
      let tieup_price = o.product.price;

      const tieup_info = o.product.tieup_prices.find((t) => {
        return t.tieup.name === tieup_information?.tieup?.name;
      });

      if (tieup_info) {
        tieup_price = tieup_info.price;
      }

      return {
        ...o,
        product: {
          ...o.product,
          price: tieup_price,
        },
      };
    });

    this.setState({ visible: true, product: newProduct, tieup_information });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const product = { ...this.state.product };
    product.add_ons = product.add_ons.filter(
      (add_on) => add_on.quantity && add_on.quantity > 0
    );

    callback(product);

    this.setState({
      visible: false,
      product: "",
      price: "",
    });
  };

  computePrice = () => {
    const product = {
      ...this.state.product,
    };

    const price = numeral(this.state.product.orig_price);

    this.state.product.add_ons.forEach((add_on, index) => {
      if (add_on.quantity && add_on.quantity > 0) {
        price.add(add_on.quantity * add_on.product.price);

        if (!isEmpty(add_on.free_quantity)) {
          price.subtract(add_on.free_quantity * add_on.product.price);
        }
      }
    });

    product.price = round(price.value());

    this.setState({
      product,
    });
  };

  onChangeFreeQuantity = (index, value) => {
    const product = { ...this.state.product };
    const add_on = { ...product.add_ons[index] };
    let quantity = value < 0 ? 0 : value;

    quantity = add_on.quantity < quantity ? add_on.quantity : quantity;
    quantity = isEmpty(add_on.quantity) ? 0 : quantity;

    product.add_ons[index] = {
      ...add_on,
      free_quantity: quantity,
    };

    this.setState({ product }, this.computePrice);
  };

  incQuantity = (index) => {
    const product = { ...this.state.product };
    const add_on = { ...product.add_ons[index] };
    let quantity = add_on.quantity ? add_on.quantity + 1 : 1;

    product.add_ons[index] = {
      ...add_on,
      quantity,
    };

    this.setState({ product }, this.computePrice);
  };

  decQuantity = (index) => {
    const product = { ...this.state.product };
    const add_on = { ...product.add_ons[index] };
    let quantity = add_on.quantity ? add_on.quantity : 1;

    quantity = quantity - 1 < 0 ? 0 : quantity - 1;

    product.add_ons[index] = {
      ...add_on,
      quantity,
    };

    this.setState({ product }, this.computePrice);
  };

  onProductOptionChange = (e) => {
    e.preventDefault();

    const product = {
      ...this.state.product,
      product_option: e.target.value,
    };

    this.setState({
      product,
    });
  };

  onSelectAlternative = (product) => {
    axios.get(`/api/products/${product._id}`).then((response) => {
      this.setState({
        product: {
          ...response.data,
          orig_price: response.data.price,
        },
      });
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Product Order Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
          width={1024}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Row>
                <Col span={16}>
                  <span className="has-text-weight-bold">
                    {this.state.product.name}
                  </span>
                </Col>
                <Col span={8}>
                  <div className="has-text-right">
                    <span style={{ fontSize: "1rem", fontStyle: "italic" }}>
                      {numberFormat(this.state.product.price)}
                    </span>
                  </div>
                </Col>
              </Row>

              <Row>
                <table className="product-order-table">
                  <tbody>
                    {this.state.product.add_ons &&
                      this.state.product.add_ons.map((add_on, index) => (
                        <tr key={index}>
                          <td>
                            <Input type="number" value={add_on.quantity} />
                          </td>
                          <td>{add_on.product.name}</td>
                          <td className="has-text-right">
                            {numberFormat(add_on.product.price)}
                          </td>
                          <td>
                            <Button
                              type="primary"
                              icon="minus"
                              size="large"
                              onClick={() => this.decQuantity(index)}
                            />
                          </td>
                          <td>
                            <Button
                              type="primary"
                              icon="plus"
                              size="large"
                              onClick={() => this.incQuantity(index)}
                            />
                          </td>

                          {/* <td>
                            <Input
                              type="number"
                              value={add_on.free_quantity}
                              onChange={(e) =>
                                this.onChangeFreeQuantity(index, e.target.value)
                              }
                            />
                          </td> */}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Row>
              <Row>
                <Col>
                  <Radio.Group
                    buttonStyle="solid"
                    onChange={this.onProductOptionChange}
                    name="product_option"
                    value={this.state.product.product_option}
                  >
                    {this.state.product.product_options &&
                      this.state.product.product_options.map((option) => (
                        <Radio.Button value={option}>{option}</Radio.Button>
                      ))}
                  </Radio.Group>
                </Col>
              </Row>
              {/* <Row style={{ marginTop: "24px" }}>
                <Col>Alternatives</Col>
                <Col>
                  <ButtonGroup>
                    {this.state.product.alternatives &&
                      this.state.product.alternatives.map((alternative) => (
                        <Button
                          onClick={() =>
                            this.onSelectAlternative(alternative.product)
                          }
                        >
                          {alternative.product.name}
                        </Button>
                      ))}
                  </ButtonGroup>
                </Col>
              </Row> */}
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
