import React, { Component } from "react";
import { connect } from "react-redux";
import isEmpty from "../validation/is-empty";
import numeral from "numeral";
import OptionBillingButton from "../commons/OptionBillingButton";
import numberFormat from "../utils/numberFormat";
import { withRouter } from "react-router-dom";
import {
  applySummary,
  processSale,
  setAccount,
  addGiftCheck,
  addCreditCard,
  setSeniorDiscount,
  removeDiscount,
  removeAccount,
  updateTable,
  updateSelectedOrderQuantity,
  updateTableOrder,
  deleteTableOrder,
} from "./../actions/posActions";
import UserLoginForm from "./UserLoginForm";
import axios from "axios";
import { message } from "antd";

class UpdateBillingOrderForm extends Component {
  state = {
    discount_rate: 0,
    is_sc: 0,
    less_vat: 0,
    less_sc_disc: 0,
    less_disc: 0,
    amount_due: 0,
    total_amount: 0,

    account: "",
    account_suggestions: [],
    account_suggestion_name: "",

    amount: "",
    modal_is_visible: false,
    account_modal_is_visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);
    this.userLoginForm = React.createRef();
  }

  componentDidMount() {
    if (isEmpty(this.props.pos.selected_order)) {
      this.props.history.push("/cashier-tables");
    }
  }

  onBack = () => {
    this.props.history.push("/billing");
  };

  onCancel = () => {
    this.setState({
      modal_is_visible: false,
    });
  };

  onSelectedOrderDecrement = () => {
    let quantity = numeral(
      this.props.pos.selected_order &&
        this.props.pos.selected_order.item.quantity
    )
      .subtract(1)
      .value();

    quantity = quantity <= 1 ? 1 : quantity;
    this.props.updateSelectedOrderQuantity({
      order: this.props.pos.selected_order,
      quantity,
    });
  };
  onSelectedOrderIncrement = () => {
    const quantity = numeral(
      this.props.pos.selected_order &&
        this.props.pos.selected_order.item.quantity
    )
      .add(1)
      .value();
    this.props.updateSelectedOrderQuantity({
      order: this.props.pos.selected_order,
      quantity,
    });
  };

  onUpdate = () => {
    this.props.updateTableOrder({
      table: this.props.pos.table,
      selected_order: this.props.pos.selected_order,
      history: this.props.history,
    });
    // this.userLoginForm.current.open((user) => {
    //   this.props.updateTableOrder({
    //     table: this.props.pos.table,
    //     selected_order: this.props.pos.selected_order,
    //     history: this.props.history,
    //   });
    // }, true);
  };

  onDelete = () => {

    const form_data = {
      ...this.props.pos.selected_order,
      table_name: this.props.pos.table.name,
      deleted: {
        user : this.props.auth.user,
      },
    };

    if (!this.props.pos.table.is_other_set) {
      axios.post("api/tables/delete-order", form_data).then(() => {
        message.success("Successfully deleted order");
      });
    }

    this.props.deleteTableOrder({
      table: this.props.pos.table,
      selected_order: this.props.pos.selected_order,
      history: this.props.history,
    });

    // this.userLoginForm.current.open((user) => {
    //   const form_data = {
    //     ...this.props.pos.selected_order,
    //     table_name: this.props.pos.table.name,
    //     deleted: {
    //       user,
    //     },
    //   };

    //   if (!this.props.pos.table.is_other_set) {
    //     axios.post("api/tables/delete-order", form_data).then(() => {
    //       message.success("Successfully deleted order");
    //     });
    //   }

    //   this.props.deleteTableOrder({
    //     table: this.props.pos.table,
    //     selected_order: this.props.pos.selected_order,
    //     history: this.props.history,
    //   });
    // }, true);
  };

  render() {
    const quantity = !isEmpty(this.props.pos.selected_order)
      ? this.props.pos.selected_order.item.quantity
      : 0;

    const selected_order = this.props.pos.selected_order;

    return (
      <div className="container box container-is-fullheight">
        <UserLoginForm ref={this.userLoginForm} />
        <div className="columns container-is-fullheight">
          <div className="column is-9 columns flex-column container-is-fullheight">
            <div className="flex-1" style={{ overflow: "auto" }}>
              <div className="has-text-centered">
                <div
                  className="has-text-weight-bold"
                  style={{ fontSize: "52px" }}
                >
                  {selected_order && selected_order.item.product.name}
                </div>
                {selected_order &&
                  selected_order.item.product.add_ons &&
                  selected_order.item.product.add_ons.length > 0 &&
                  selected_order.item.product.add_ons.map((add_on) => (
                    <div>
                      {add_on.quantity} - {add_on.product.name}
                    </div>
                  ))}
                <br />
                <span style={{ fontStyle: "italic" }}>
                  @{" "}
                  {numberFormat(
                    this.props.pos.selected_order &&
                      this.props.pos.selected_order.item.product.price
                  )}
                </span>
                <div>
                  <input
                    type="button"
                    style={{
                      height: "100px",
                      width: "100px",
                    }}
                    className="button"
                    value="-"
                    onClick={this.onSelectedOrderDecrement}
                  />
                  <input
                    type="text"
                    className="has-text-centered"
                    style={{
                      height: "100px",
                      width: "200px",
                      border: "1px solid #dbdbdb",
                      fontSize: "42px",
                    }}
                    value={quantity}
                    readOnly
                  />
                  <input
                    type="button"
                    style={{
                      height: "100px",
                      width: "100px",
                    }}
                    className="button"
                    value="+"
                    onClick={this.onSelectedOrderIncrement}
                  />
                </div>
              </div>
              <div className="has-text-centered" style={{ marginTop: "32px" }}>
                <input
                  type="button"
                  className="button is-primary"
                  value="Update"
                  onClick={this.onUpdate}
                  style={{
                    height: "80px",
                    width: "300px",
                  }}
                />
              </div>
              <div className="has-text-centered" style={{ marginTop: "32px" }}>
                <input
                  type="button"
                  className="button is-danger"
                  value="Cancel Order"
                  style={{
                    height: "80px",
                    width: "300px",
                  }}
                  onClick={this.onDelete}
                />
              </div>
            </div>
          </div>
          <div className="column is-3" style={{ padding: "1rem" }}>
            <div className="columns is-multiline">
              <OptionBillingButton
                label="Back"
                icon="fas fa-angle-left"
                onClick={this.onBack}
              />
            </div>
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
  applySummary,
  processSale,
  setAccount,
  addGiftCheck,
  addCreditCard,
  setSeniorDiscount,
  removeDiscount,
  removeAccount,
  updateTable,
  updateSelectedOrderQuantity,
  updateTableOrder,
  deleteTableOrder,
})(withRouter(UpdateBillingOrderForm));
