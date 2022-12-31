import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  getCategories,
  getProducts,
  addOrder,
  incrementOrder,
  setOrderQuantity,
  clearOrders,
  cancelOrders,
  getProductsFromCategory,
  setTieup,
  removeTieup,
  setCustomer,
  removeCustomer,
} from "../actions/posActions";
import OptionButton from "../commons/OptionButton";
import isEmpty from "../validation/is-empty";
import numeral from "numeral";
import _ from "lodash";
import axios from "axios";

import { Icon, message } from "antd";
import UserLoginForm from "./UserLoginForm";
import ProductOrderForm from "./ProductOrderForm";
import socketIoClient from "socket.io-client";
import { SOCKET_ENDPOINT } from "../utils/constants";
import InputModal from "./InputModal";
import { getProductTieupPrice } from "../utils/functions";
import SelectWaiterModal from "./SelectWaiterModal";
import SelectTieupModal from "./SelectTieupModal";
import CustomerInfoForm from "./CustomerInfoForm";
import validator from "validator";

let socket;

class OrderForm extends Component {
  state = {
    input: "",
    product: "",
  };

  constructor(props) {
    super(props);
    this.userLoginForm = React.createRef();
    this.productOrderForm = React.createRef();
    this.gcReferenceModal = React.createRef();
    this.selectWaiterModal = React.createRef();
    this.selectTieupModal = React.createRef();
    this.customerInfoForm = React.createRef();
  }

  componentDidMount = () => {
    //redirect if no table number
    socket = socketIoClient(SOCKET_ENDPOINT);

    if (isEmpty(this.props.pos.table._id)) {
      this.props.history.push("/cashier-tables");
    }

    if (this.input) this.input.focus();

    this.props.getCategories();
    this.props.getProducts({
      tieup_information: this.props.pos.table?.tieup_information,
    });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onBack = () => {
    this.props.clearOrders();
    this.props.history.push("/cashier-tables");
  };

  onProductSelect = (product) => {
    axios.get(`/api/products/${product._id}`).then(async (response) => {
      const product = response.data;
      let quantity = isEmpty(this.state.input)
        ? 1
        : parseFloat(this.state.input);

      //check price if tieup

      let price_result = await getProductTieupPrice({
        product,
        tieup: this.props.pos.table?.tieup_information?.tieup,
      });

      product.price = price_result.price;

      //find product in order
      const order = _.find(this.props.pos.orders, (order) => {
        return order.product._id === product._id;
      });

      /**
       * if input is not a number, create an error
       */

      if (isNaN(this.state.input)) {
        /**
         * for price modification ; it has @
         */
        let input = this.state.input;
        const arr_input = this.state.input.split("@");

        if (this.state.input.includes("@") || this.state.input.includes("#")) {
          const quantity = validator.isNumeric(arr_input[0].split("#")[0])
            ? parseFloat(arr_input[0].split("#")[0])
            : 1;

          const price = validator.isNumeric(
            arr_input?.[1]?.split("#")?.[0] || ""
          )
            ? parseFloat(arr_input[1].split("#")[0])
            : product.price;

          let remarks = input.split("#")[input.split("#").length - 1];

          if (!input.includes("#")) {
            remarks = "";
          }

          /* console.log(quantity); */

          if (isEmpty(order) || !isEmpty(this.state.input)) {
            this.props.addOrder(product, quantity, price, remarks);
          } else {
            this.props.setOrderQuantity(
              this.props.pos.orders,
              order,
              quantity,
              price,
              remarks
            );
          }
          // this.userLoginForm.current.open(() => {
          //   const quantity = validator.isNumeric(arr_input[0])
          //     ? parseFloat(arr_input[0])
          //     : 1;

          //   const price = validator.isNumeric(arr_input[1])
          //     ? parseFloat(arr_input[1])
          //     : product.price;

          //   const remarks = input.split("#")[input.split("#").length - 1];

          //   if (isEmpty(order)) {
          //     this.props.addOrder(product, quantity, price, remarks);
          //   } else {
          //     this.props.setOrderQuantity(
          //       this.props.pos.orders,
          //       order,
          //       quantity,
          //       price,
          //       remarks
          //     );
          //   }
          // }, true);
        }

        /**
         * No supervisor authorization
         */
        /* if (input.includes("#")) {
          const split = input.split("#");
          const remarks = split[split.length - 1];

          let quantity = validator.isNumeric(split[0])
            ? parseFloat(split[0])
            : 1;

          if (isEmpty(order)) {
            this.props.addOrder(product, quantity, product.price, remarks);
          } else {
            this.props.setOrderQuantity(
              this.props.pos.orders,
              order,
              quantity,
              product.price,
              remarks
            );
          }
        } */

        if (
          !this.state.input.includes("@") &&
          !this.state.input.includes("#")
        ) {
          message.error("Please enter a numeric quantity");
        }
      } else if (product.add_ons && product.add_ons.length > 0) {
        this.productOrderForm.current.open({
          c: (product) => {
            /**
             * call back on adding a product with product add-ons/options
             */
            this.props.addOrder(product, 1);
            if (this.input) this.input.focus();
          },
          product,
          tieup_information: this.props.pos?.table?.tieup_information,
        });
      } else if (product.is_gift_check) {
        // is a gift check
        this.gcReferenceModal.current.open((reference) => {
          const gc_product = {
            ...product,
            gc_reference: reference,
          };

          this.props.addOrder(gc_product, 1);
          if (this.input) this.input.focus();
        });
      } else {
        if (isEmpty(order) || !isEmpty(this.state.input)) {
          this.props.addOrder(product, quantity, product.price);
        } else {
          if (isEmpty(this.state.input)) {
            this.props.incrementOrder(this.props.pos.orders, order, quantity);
          } else {
            this.props.setOrderQuantity(this.props.pos.orders, order, quantity);
          }
        }
      }

      this.clearInput();
    });
  };

  clearInput = () => {
    this.setState({ input: "" });
    if (this.input) this.input.focus();
  };

  updateOrderQuantity = (order) => {
    const order_quantity = parseFloat(order.quantity);

    /**
     * generate error if input is string
     */
    if (isNaN(this.state.input)) {
      message.error("Please enter a numeric value");
      this.input.select();
      if (this.input) this.input.focus();
      return;
    }

    const quantity = isEmpty(this.state.input)
      ? order_quantity - 1
      : this.state.input;

    this.props.setOrderQuantity(this.props.pos.orders, order, quantity);

    this.setState({ input: "" });
    if (this.input) this.input.focus();
  };

  getOrderAmount = () => {
    const total_amount = _.sumBy(this.props.pos.orders, (o) => {
      return o.amount;
    });

    return numeral(total_amount).format("0,0.00");
  };

  onProcess = () => {
    this.selectWaiterModal.current.open((waiter) => {
      axios
        .post(`/api/tables/${this.props.pos.table._id}/orders`, {
          order: this.props.pos.orders,
          user: waiter,
          tieup_information: this.props.pos.table?.tieup_information,
          customer: this.props.pos.table?.customer,
        })
        .then((response) => {
          this.props.clearOrders();
          this.props.history.push("/cashier-tables");
          socket.emit("refresh_table", true);
        })
        .catch((err) => console.log(err));
    });
  };

  onBilling = () => {
    this.props.history.push("/billing");
  };

  onTransferTable = () => {
    this.props.history.push("/select-table");
  };

  onCancel = () => {
    this.userLoginForm.current.open((user) => {
      this.props.cancelOrders({
        table: this.props.pos.table,
        history: this.props.history,
        user: this.props.auth.user,
        authorized_by: user,
      });
    }, true);
  };

  onSelectCategory = (category) => {
    this.props.getProductsFromCategory({
      category,
      page: this.props.pos.products_pagination.page,
      tieup_information: this.props.pos.table?.tieup_information,
    });
    if (this.input) this.input.focus();
  };

  handleCategoriesPagination = (newPage) => {
    const page = newPage === 0 ? 1 : newPage;

    if (page > this.props.pos.categories_pagination.pageCount) {
      return;
    }

    this.setState({ page }, () => this.props.getCategories(page));
  };

  handleProductsPagination = (newPage, selected_category) => {
    const page = newPage === 0 ? 1 : newPage;

    if (page > this.props.pos.products_pagination.pageCount) {
      /* console.log(page, this.props.pos.categories_pagination.pageCount); */
      return;
    }

    this.setState({ page }, () => {
      if (this.props.pos.selected_category === null) {
        this.props.getProducts({
          page,
          tieup_information: this.props.pos.table?.tieup_information,
        });
      } else {
        this.props.getProductsFromCategory({
          category: selected_category,
          page,
          tieup_information: this.props.pos.table?.tieup_information,
        });
      }
    });
  };

  search = (page = 1) => {
    axios
      .get(`/api/categories/paginate/?page=${page}`)
      .then((response) =>
        this.setState({
          categories: response.data.docs,
          pageCount: response.data.pages,
        })
      )
      .catch((err) => console.log(err));
  };

  searchProduct = () => {
    this.props.getProducts({
      s: this.state.input,
      tieup_information: this.props.pos.table?.tieup_information,
    });
    this.setState({ input: "" });
  };

  focusInput = () => {
    if (this.input) this.input.focus();
  };

  onSelectTieup = () => {
    this.selectTieupModal.current.open((tieup_information) => {
      this.props.setTieup({ tieup_information, orders: this.props.pos.orders });

      this.props.getProducts({
        tieup_information,
      });
    });
  };

  onRemoveTieup = () => {
    this.props.removeTieup({ orders: this.props.pos.orders });
  };

  onSetCustomer = () => {
    this.customerInfoForm.current.open((customer) => {
      this.props.setCustomer({ customer });
    });
  };

  onRemoveCustomer = () => {
    this.props.removeCustomer();
  };

  render() {
    // for authenciation
    const is_authenticated = this.props.auth.isAuthenticated || true;

    const categories_pagination = [
      <div
        key="left"
        className=" OrderForm--category-container has-background-primary"
        onClick={() => {
          this.handleCategoriesPagination(
            this.props.pos.categories_pagination.page - 1
          );
          if (this.input) this.input.focus();
        }}
      >
        <Icon type="left" className="has-text-white" theme="outlined" />
      </div>,
      <div
        key="right"
        className=" OrderForm--category-container has-background-primary"
        onClick={() => {
          this.handleCategoriesPagination(
            this.props.pos.categories_pagination.page + 1
          );
          if (this.input) this.input.focus();
        }}
      >
        <Icon type="right" className="has-text-white" theme="outlined" />
      </div>,
    ];

    const products_pagination = (
      <div className="is-flex" style={{ justifyContent: "flex-end" }}>
        <div
          className="OrderForm--product-container has-background-primary"
          style={{ lineHeight: "4vw" }}
          onClick={() => {
            this.handleProductsPagination(
              this.props.pos.products_pagination.page - 1,
              this.props.pos.selected_category
            );
            if (this.input) this.input.focus();
          }}
        >
          <Icon type="left" className="has-text-white" theme="outlined" />
        </div>
        <div
          className="OrderForm--product-container has-background-primary"
          style={{ lineHeight: "4vw" }}
          onClick={() => {
            this.handleProductsPagination(
              this.props.pos.products_pagination.page + 1,
              this.props.pos.selected_category
            );
            if (this.input) this.input.focus();
          }}
        >
          <Icon type="right" className="has-text-white" theme="outlined" />
        </div>
      </div>
    );

    return (
      <div className="pad-container is-flex is-full-height">
        <CustomerInfoForm ref={this.customerInfoForm} />

        <InputModal
          title="GC Reference"
          placeholder="GC Reference"
          ref={this.gcReferenceModal}
        />
        <UserLoginForm
          ref={this.userLoginForm}
          focusInput={this.focusInput}
          supervisor_authentication={true}
        />
        <ProductOrderForm
          ref={this.productOrderForm}
          product={this.state.product}
        />
        <SelectWaiterModal
          ref={this.selectWaiterModal}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <SelectTieupModal
          ref={this.selectTieupModal}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <div className="is-flex flex-1  flex-row">
          <div className=" is-flex flex-column flex-1">
            <div className="flex-10 is-flex flex-row">
              <div className="is-flex flex-column">
                <div className="flex-wrap is-flex" style={{ width: "15vw" }}>
                  {categories_pagination}
                  <div
                    onClick={() => {
                      this.props.getProducts({
                        tieup_information:
                          this.props.pos.table?.tieup_information,
                      });
                      this.focusInput();
                    }}
                    className=" OrderForm--category-container has-background-primary"
                  >
                    All
                  </div>
                  {(this.props.pos.categories || []).map((category) => (
                    <div
                      key={category._id}
                      onClick={() => this.onSelectCategory(category)}
                      className=" OrderForm--category-container has-background-primary"
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className=" is-flex flex-column flex-1">
                <div
                  className="is-flex flex-wrap flex-1"
                  style={{ alignContent: "flex-start" }}
                >
                  {(this.props.pos.products || []).map((product) => (
                    <div
                      onClick={() => this.onProductSelect(product)}
                      key={product._id}
                      className=" OrderForm--product-container  
                       has-text-white"
                      style={{
                        ...(product.category && product.category.color
                          ? {
                              backgroundColor: product.category.color,
                            }
                          : {
                              backgroundColor: "#209CEE",
                            }),
                      }}
                    >
                      {product.name}
                      <br />
                      {product.price}
                    </div>
                  ))}
                </div>
                {products_pagination}
              </div>
            </div>
            <div className="is-flex flex-row">
              <OptionButton
                label="Back"
                icon="fas fa-angle-left"
                onClick={this.onBack}
              />
              {!isEmpty(this.props.pos.table.orders) && [
                <OptionButton
                  key="cancel"
                  label="Cancel"
                  icon="fas fa-times"
                  onClick={this.onCancel}
                />,

                <OptionButton
                  key="bill"
                  label="Orders"
                  icon="fas fa-receipt"
                  onClick={this.onBilling}
                />,

                this.props.auth.user && this.props.auth.user.name && (
                  <OptionButton
                    key="transfer"
                    label="Transfer Table"
                    icon="fas fa-exchange-alt"
                    onClick={this.onTransferTable}
                  />
                ),
              ]}
              {/* {isEmpty(this.props.pos?.table?.tieup_information?.tieup)
                ? this.props.pos.orders.length <= 0 &&
                  this.props.pos.table?.orders?.length <= 0 && (
                    <OptionButton
                      label="Select Tieup"
                      icon="fas fa-motorcycle"
                      onClick={this.onSelectTieup}
                    />
                  )
                : this.props.pos.orders.length <= 0 &&
                  this.props.pos.table?.orders?.length <= 0 && (
                    <OptionButton
                      label="Remove Tieup"
                      icon="fas fa-times"
                      onClick={this.onRemoveTieup}
                    />
                  )} */}

              {isEmpty(this.props.pos?.table?.customer?.name) ? (
                <OptionButton
                  label="Set Customer"
                  icon="fas fa-user"
                  onClick={this.onSetCustomer}
                />
              ) : (
                <OptionButton
                  label="Remove Customer"
                  icon="fas fa-times"
                  onClick={this.onRemoveCustomer}
                />
              )}

              {!isEmpty(this.props.pos.orders) && (
                <OptionButton
                  label="Process"
                  icon="fas fa-check"
                  onClick={this.onProcess}
                />
              )}
            </div>
          </div>
          <div
            className=" box is-flex flex-column"
            style={{
              width: "20vw",
            }}
          >
            <div style={{ fontSize: "1vw" }}>
              Table #{" "}
              <span style={{ fontWeight: "bold", fontSize: "1.5vw" }}>
                {this.props.pos.table.name}
              </span>
            </div>
            <div className="flex-1" style={{ overflow: "auto" }}>
              <table className="full-width OrderForm--orders-table">
                <tbody>
                  {!isEmpty(
                    this.props.pos.table.tieup_information?.tieup?.name
                  ) && (
                    <tr className="order-item-display" key="tieup">
                      <td colSpan="2" style={{ padding: "1vw 0.3vw" }}>
                        <div className="has-text-weight-bold">
                          <div>
                            {
                              this.props.pos.table?.tieup_information?.tieup
                                ?.name
                            }{" "}
                          </div>
                          <div>
                            Ref:
                            {
                              this.props.pos.table?.tieup_information
                                ?.booking_reference
                            }{" "}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isEmpty(this.props.pos.table.customer?.name) && (
                    <tr className="order-item-display" key="tieup">
                      <td colSpan="2" style={{ padding: "1vw 0.3vw" }}>
                        <div className="has-text-weight-bold">
                          <div>{this.props.pos.table?.customer?.name} </div>
                          <div>{this.props.pos.table?.customer?.time}</div>
                          <div>
                            {this.props.pos.table?.customer?.contact_no}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {(this.props.pos.orders || []).map((order, i) => (
                    <tr
                      className="order-item-display"
                      key={i}
                      onClick={() => this.updateOrderQuantity(order)}
                    >
                      <td style={{ padding: "1vw 0.3vw" }}>
                        <div className="has-text-weight-bold">
                          {order.product.name}
                          {order.product.add_ons &&
                            order.product.add_ons.length > 0 && (
                              <div className="product-add-on">
                                <ul>
                                  {order.product.add_ons.map((add_on) => (
                                    <li key={add_on._id}>
                                      {add_on.quantity} - {add_on.product.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          {order.product.product_option && (
                            <div className="product-add-on">
                              {order.product.product_option}
                            </div>
                          )}
                        </div>
                        {!isEmpty(order.remarks) && (
                          <div className="is-small">
                            Remarks: {order.remarks}
                          </div>
                        )}
                        {order.product.is_gift_check &&
                          order.product.gc_reference && (
                            <div className="is-small">
                              {" "}
                              GC #{order.product.gc_reference}
                            </div>
                          )}
                        {order.quantity > 1 && (
                          <div>
                            {order.quantity}{" "}
                            {is_authenticated && (
                              <span>
                                @ {numeral(order.price).format("0,0.00")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className="has-text-right"
                        style={{ padding: "1vw 0.3vw" }}
                      >
                        {is_authenticated &&
                          numeral(order.amount).format("0,0.00")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {is_authenticated && (
              <div className="has-text-right OrderForm--amount-container">
                {this.getOrderAmount()}
              </div>
            )}

            {is_authenticated && (
              <div>
                <input
                  type="text"
                  value={this.state.input}
                  onChange={this.onChange}
                  name="input"
                  onKeyDown={(event) => {
                    if (event.keyCode === 13) this.searchProduct();
                  }}
                  ref={(input) => (this.input = input)}
                  className="input has-text-right"
                  autoComplete="off"
                  style={{
                    width: "100%",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    pos: state.pos,
    auth: state.auth,
  };
};

export default connect(mapStateToProps, {
  getCategories,
  getProducts,
  addOrder,
  incrementOrder,
  setOrderQuantity,
  clearOrders,
  cancelOrders,
  getProductsFromCategory,
  setTieup,
  removeTieup,
  setCustomer,
  removeCustomer,
})(withRouter(OrderForm));
