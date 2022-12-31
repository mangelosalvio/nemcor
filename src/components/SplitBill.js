import React, { Component } from "react";
import { connect } from "react-redux";
import isEmpty from "../validation/is-empty";
import numeral from "numeral";
import { remove } from "lodash";
import round from "../utils/round";
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
  selectOrder,
  setManualDiscount,
  setTable,
} from "./../actions/posActions";
import classnames from "classnames";
import axios from "axios";
import AutoSuggestFieldGroup from "../commons/AutoSuggestFieldGroup";
import { message, Divider } from "antd";
import moment from "moment";
import UserLoginForm from "./UserLoginForm";
import SplitBillOptioButton from "../commons/SplitBillOptionButton";
import TableNameModal from "./TableNameModal";
import socketIoClient from "socket.io-client";
import { SOCKET_ENDPOINT } from "../utils/constants";

let socket;
class SplitBill extends Component {
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

    table: {
      name: "",
      orders: [],
      payments: [],
    },

    transfer_table: {
      name: "",
      orders: [],
      payments: [],
    },

    errors: {},
  };

  constructor(props) {
    super(props);
    this.seniorDiscountForm = React.createRef();
    this.giftCheckForm = React.createRef();
    this.creditCardForm = React.createRef();
    this.userLoginForm = React.createRef();
    this.accountBillingForm = React.createRef();
    this.accountBillingField = React.createRef();
    this.ordersSelectionModal = React.createRef();
    this.tableNameForm = React.createRef();
  }

  componentDidMount() {
    socket = socketIoClient(SOCKET_ENDPOINT);

    if (isEmpty(this.props.pos.table._id)) {
      this.props.history.push("/cashier-tables");
    } else {
      this.props.setTable(this.props.pos.table);
    }
  }

  componentDidUpdate = (prevProps, prevState) => {
    if (this.props.pos && prevProps.pos.table !== this.props.pos.table) {
      this.setState({ table: this.props.pos.table });
    }
  };

  getAccountBalance = (account) => {
    return new Promise((resolve, reject) => {
      axios
        .get(`/api/accounts/${account._id}/balance`)
        .then((response) => {
          resolve(response.data.balance);
        })
        .catch((err) => {
          reject(0);
        });
    });
  };

  /**
   * ACCOUNT AUTOSUGGEST
   */

  onAccountSuggestChange = (event, { newValue, method }) => {
    this.setState({ [event.target.name]: newValue });
  };

  onAccountsSuggestionsFetchRequested = ({ value }) => {
    axios
      .get("/api/accounts/?s=" + value)
      .then((response) => this.setState({ account_suggestions: response.data }))
      .catch((err) => console.log(err));
  };

  onAccountsSuggestionsClearRequested = () => {
    this.setState({ account_suggestions: [] });
  };

  onAccountsRenderSuggestion = (suggestion) => <div>{suggestion.name}</div>;

  onAccountsSuggestionSelected = (event, { suggestion }) => {
    event.preventDefault();
    this.setState({
      account: suggestion,
      account_suggestion_name: suggestion.name,
    });
  };

  onAccountsGetSuggestionValue = (suggestion) => suggestion.name;

  /**
   * END ACCOUNT AUTOSUGGEST
   */

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onBack = () => {
    this.props.history.push("/billing");
    //console.log(this.state.table);
  };

  onPrintBilling = () => {
    const summary = {
      ...this.state.table.summary,
      ...this.computeSummary(),
    };
    const payments = {
      ...this.state.table.payments,
    };

    const user = this.props.auth.user;
    axios
      .post(`/api/tables/${this.state.table._id}/print`, {
        summary,
        user,
        payments,
      })
      .then((response) => console.log(response.data))
      .catch((err) => console.log(err));
  };

  onSeniorDiscount = () => {
    this.props.history.push("/senior-billing-form");
    /* this.seniorDiscountForm.current.open(
      ({ number_of_persons, number_of_seniors }) => {
        this.props.setSeniorDiscount({
          number_of_persons,
          number_of_seniors,
          table: this.state.table
        });
      }
    ); */
  };

  onRemoveDiscount = () => {
    this.props.removeDiscount(this.state.table);
  };

  onRemoveAccount = () => {
    this.props.removeAccount(this.state.table);
  };

  onRemoveGiftCheck = (gift_check) => {
    let gift_checks = this.state.table.payments.gift_checks.filter((gc) => {
      return gc.items.gift_check_number !== gift_check.items.gift_check_number;
    });

    const table = {
      ...this.state.table,
      payments: {
        ...this.state.table.payments,
        gift_checks,
      },
    };

    this.props.updateTable({ table });
    /**
     * update giftcheck to unused
     */
    axios
      .post("/api/gift-checks/unuse", {
        gift_check_id: gift_check.items._id,
      })
      .then(() => {
        message.success("Gift check removed successfully");
      });
  };

  onRemoveCreditCard = (credit_card) => {
    let credit_cards = this.state.table.payments.credit_cards.filter((cc) => {
      return cc._id !== credit_card._id;
    });

    const table = {
      ...this.state.table,
      payments: {
        ...this.state.table.payments,
        credit_cards,
      },
    };

    this.props.updateTable({ table });
  };

  onApplyDiscount = () => {
    this.props.history.push("/manual-discount-form");

    /* this.userLoginForm.current.open(user => {
      this.props.setManualDiscount({
        table: this.state.table,
        history: this.props.history,
        discount_rate: 0.1
      });
    }); */
  };

  onProcessPayment = () => {
    this.setState(
      {
        modal_is_visible: true,
      },
      () => this.input_amount.focus()
    );
  };

  onSelectAccount = () => {
    this.accountBillingForm.current.open(async (account) => {
      await this.setState({
        account: account,
      });

      const { amount_due } = this.computeSummary();

      this.getAccountBalance(this.state.account).then((balance) => {
        const account_debit = amount_due > balance ? balance : amount_due;

        const account = {
          ...this.state.account,
          account_debit: account_debit,
        };

        this.props.setAccount({ account, table: this.state.table });
      });
    });
  };

  onCancel = () => {
    this.setState({
      modal_is_visible: false,
    });
  };

  onAccountSelectCancel = () => {
    this.setState({
      account_modal_is_visible: false,
    });
  };

  /**
   * ON PROCESS SALE
   */
  onSubmit = (e) => {
    e.preventDefault();
    /**
     * get table name with prefix of table # e.g. 4 - A
     */

    this.tableNameForm.current.open((name) => {
      const form_data = {
        table: {
          ...this.state.table,
        },
        transfer_table: {
          ...this.state.transfer_table,
        },
        name,
      };

      const loading = message.loading("Processing...");
      axios.post("/api/tables/split", form_data).then(() => {
        loading();
        message.success("Split Bill Successfull");
        socket.emit("refresh_table", true);
        this.props.history.push("/cashier-tables");
      });
    });
  };

  onAccountSubmit = (e) => {
    e.preventDefault();

    const { amount_due } = this.computeSummary();

    this.getAccountBalance(this.state.account).then((balance) => {
      const account_debit = amount_due > balance ? balance : amount_due;

      const account = {
        ...this.state.account,
        account_debit: account_debit,
      };
      this.props.setAccount({ account, table: this.state.table });
      this.onAccountSelectCancel();
    });
  };

  onAddGiftCheck = () => {
    this.giftCheckForm.current.open((gift_check) => {
      this.props.addGiftCheck({
        table: this.state.table,
        gift_check,
      });
    });
  };

  onAddCreditCard = () => {
    this.creditCardForm.current.open((credit_card) => {
      this.props.addCreditCard({
        table: this.state.table,
        credit_card,
      });
    });
  };

  onUpdateOrder = (order) => {
    this.props.selectOrder({
      order: { ...order },
      history: this.props.history,
    });
  };

  onTransferOrder = (order, item_index, reverse = false) => {
    const item = order.item;
    let table = { ...this.state.table };
    let transfer_table = { ...this.state.transfer_table };

    if (reverse) {
      table = {
        ...this.state.transfer_table,
      };
      transfer_table = {
        ...this.state.table,
      };
    }

    let transfer_item = {
      ...item,
      quantity: 1,
      price: item.price,
      amount: round(item.price * 1),
    };

    /**
     * find order and item on the transfer table
     */

    const order_index = transfer_table.orders.findIndex(
      (o) => order._id === o._id
    );

    if (order_index === -1) {
      /**
       * transfer order order and index
       */
      transfer_table = {
        ...transfer_table,
        orders: [
          ...transfer_table.orders,
          {
            ...order,
            items: [transfer_item],
          },
        ],
      };

      /**
       * reduce quantity of the item
       */

      const updated_order = table.orders.find((o) => order.order._id === o._id);

      const updated_order_index = table.orders.findIndex(
        (o) => order.order._id === o._id
      );

      let updated_item = updated_order.items[item_index];

      updated_item.quantity--;

      if (updated_item.quantity <= 0) {
        remove(updated_order.items, (o, index) => index === item_index);
        /**
         * remove order if there are no items
         */

        if (updated_order.items.length <= 0) {
          remove(table.orders, (order, index) => index === updated_order_index);
        }
      } else {
        updated_item.amount = round(updated_item.quantity * updated_item.price);
      }
    } else {
      /**
       * order is found on the transferred table
       */

      /**
       * item with different price
       */
      const transfer_item_index = transfer_table.orders[
        order_index
      ].items.findIndex(
        (o) =>
          o.product._id === item.product._id &&
          o.product.price === item.product.price
      );

      /**
       * product is not found or product has addons or product has
       */

      const has_add_ons =
        item.product.add_ons && item.product.add_ons.length > 0;
      const has_product_option =
        item.product.product_option && !isEmpty(item.product.product_option);

      if (transfer_item_index === -1 || has_add_ons || has_product_option) {
        /**
         * product is not found
         */

        transfer_table.orders[order_index].items = [
          ...transfer_table.orders[order_index].items,
          transfer_item,
        ];

        /**
         * reduce quantity of the item
         */

        const updated_order = table.orders.find((o) => {
          return order.order._id === o._id;
        });

        const updated_order_index = table.orders.findIndex(
          (o) => order.order._id === o._id
        );

        let updated_item = updated_order.items[item_index];

        updated_item.quantity--;

        if (updated_item.quantity <= 0) {
          remove(updated_order.items, (o, index) => index === item_index);

          /**
           * remove order if there are no items
           */

          if (updated_order.items.length <= 0) {
            remove(table.orders, (o, index) => index === updated_order_index);
          }
        } else {
          updated_item.amount = round(
            updated_item.quantity * updated_item.price
          );
        }
      } else {
        /**
         * product is found in the order
         */
        let item_query = {
          ...transfer_table.orders[order_index].items[transfer_item_index],
        };

        item_query.quantity++;
        item_query.amount = round(item_query.quantity * item_query.price);

        transfer_table.orders[order_index].items[
          transfer_item_index
        ] = item_query;

        /**
         * reduce quantity of the item
         */
        const updated_order = table.orders.find(
          (o) => order.order._id === o._id
        );

        const updated_order_index = table.orders.findIndex(
          (o) => order.order._id === o._id
        );

        let updated_item = updated_order.items[item_index];

        updated_item.quantity--;

        if (updated_item.quantity <= 0) {
          remove(updated_order.items, (o, index) => index === item_index);

          /**
           * remove order if there are no items
           */

          if (updated_order.items.length <= 0) {
            remove(table.orders, (o, index) => index === updated_order_index);
          }
        } else {
          updated_item.amount = round(
            updated_item.quantity * updated_item.price
          );
        }
      }
    }

    this.setState({
      transfer_table: !reverse ? transfer_table : table,
      table: !reverse ? table : transfer_table,
    });
  };

  onOrdersReprint = () => {
    this.ordersSelectionModal.current.open(
      () => {
        message.success("Order Reprinted");
      },
      { orders: [...this.state.table.orders], table: this.state.table }
    );
  };

  render() {
    let overall_orders = [];
    let transfer_table_orders = [];
    if (this.state.table && this.state.table.orders) {
      this.state.table.orders.forEach((order) => {
        order.items.forEach((item, index) => {
          const o = {
            item: { ...item },
            user: order.user,
            datetime: order.datetime,
            order_id: order.order_id,
            order: {
              _id: order._id,
              user: order.user,
              datetime: order.datetime,
              order_id: order.order_id,
            },
            item_index: index,
          };
          overall_orders = [...overall_orders, o];
        });
      });
    }

    if (this.state.transfer_table && this.state.transfer_table.orders) {
      this.state.transfer_table.orders.forEach((order) => {
        order.items.forEach((item, index) => {
          const o = {
            item: { ...item },
            user: order.user,
            datetime: order.datetime,
            order_id: order.order_id,
            order: {
              _id: order._id,
              user: order.user,
              datetime: order.datetime,
              order_id: order.order_id,
            },
            item_index: index,
          };
          transfer_table_orders = [...transfer_table_orders, o];
        });
      });
    }

    return (
      <div className="container box container-is-fullheight">
        <TableNameModal ref={this.tableNameForm} />

        <UserLoginForm ref={this.userLoginForm} />
        <div className="columns container-is-fullheight">
          <div className="column is-5 columns flex-column container-is-fullheight">
            <div
              className="flex-1"
              style={{ overflow: "auto", padding: "8px" }}
            >
              <div>
                <div className="module-heading">SPLIT BILL</div>
                Table #
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "24px",
                    marginLeft: "12px",
                  }}
                >
                  {this.state.table.name}
                </span>
              </div>
              <table className="is-fullwidth table">
                <thead>
                  <tr>
                    <th>QTY</th>
                    <th>PRODUCT</th>
                    <th className="has-text-right">PRICE</th>
                    <th className="has-text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {overall_orders.map((order, i) => (
                    <tr
                      key={i}
                      onClick={() =>
                        this.onTransferOrder(order, order.item_index)
                      }
                    >
                      <td>{order.item.quantity}</td>
                      <td>
                        <div className="has-text-weight-bold">
                          {order.item.product.name}
                        </div>{" "}
                        {order.item.product.add_ons &&
                          order.item.product.add_ons.length > 0 &&
                          order.item.product.add_ons.map((add_on) => (
                            <div>
                              {add_on.quantity} - {add_on.product.name}
                            </div>
                          ))}
                        {order.item.product.product_option && (
                          <div>{order.item.product.product_option}</div>
                        )}
                        <br />
                        <div style={{ fontSize: "10px", fontStyle: "italic" }}>
                          OS # {order.order_id} <Divider type="vertical" />
                          {moment(order.datetime).format("lll")}{" "}
                          <Divider type="vertical" /> Waiter:{" "}
                          {order.user && order.user.name}
                        </div>
                      </td>
                      <td className="has-text-right">
                        {numeral(order.item.price).format("0,0.00")}
                      </td>
                      <td className="has-text-right">
                        {numeral(order.item.amount).format("0,0.00")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="column is-5 columns flex-column container-is-fullheight">
            <div
              className="flex-1"
              style={{ overflow: "auto", padding: "8px" }}
            >
              <div>
                Table #
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "24px",
                    marginLeft: "12px",
                  }}
                >
                  Transfered Table
                </span>
              </div>
              <table className="is-fullwidth table">
                <thead>
                  <tr>
                    <th>QTY</th>
                    <th>PRODUCT</th>
                    <th className="has-text-right">PRICE</th>
                    <th className="has-text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer_table_orders.map((order, i) => (
                    <tr
                      key={i}
                      onClick={() =>
                        this.onTransferOrder(order, order.item_index, true)
                      }
                    >
                      <td>{order.item.quantity}</td>
                      <td>
                        <div className="has-text-weight-bold">
                          {order.item.product.name}
                        </div>{" "}
                        {order.item.product.add_ons &&
                          order.item.product.add_ons.length > 0 &&
                          order.item.product.add_ons.map((add_on) => (
                            <div>
                              {add_on.quantity} - {add_on.product.name}
                            </div>
                          ))}
                        {order.item.product.product_option && (
                          <div>{order.item.product.product_option}</div>
                        )}
                        <br />
                        <div style={{ fontSize: "10px", fontStyle: "italic" }}>
                          OS # {order.order_id} <Divider type="vertical" />
                          {moment(order.datetime).format("lll")}{" "}
                          <Divider type="vertical" /> Waiter:{" "}
                          {order.user && order.user.name}
                        </div>
                      </td>
                      <td className="has-text-right">
                        {numeral(order.item.price).format("0,0.00")}
                      </td>
                      <td className="has-text-right">
                        {numeral(order.item.amount).format("0,0.00")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="column is-2">
            <div className="columns ">
              <SplitBillOptioButton
                label="Back"
                icon="fas fa-angle-left"
                onClick={this.onBack}
              />
            </div>

            {this.state.transfer_table.orders &&
              this.state.transfer_table.orders.length > 0 && (
                <div className="columns ">
                  <SplitBillOptioButton label="Save" onClick={this.onSubmit} />
                </div>
              )}
          </div>
        </div>

        {/* PAYMENT MODAL */}
        <div
          className={classnames("modal", {
            "is-active": this.state.modal_is_visible,
          })}
        >
          <div className="modal-background" />
          <div className="modal-card">
            <form onSubmit={this.onSubmit}>
              <header className="modal-card-head">
                <p className="modal-card-title">Enter Amount</p>
                <button className="delete" aria-label="close" />
              </header>
              <section className="modal-card-body">
                {this.state.errors.amount && (
                  <div className="notification is-danger">
                    <button className="delete" />
                    {this.state.errors.amount}
                  </div>
                )}

                <input
                  type="number"
                  className="input"
                  name="amount"
                  value={this.state.amount}
                  onChange={this.onChange}
                  autoComplete="off"
                  ref={(input) => (this.input_amount = input)}
                />
              </section>
              <footer className="modal-card-foot">
                <button className="button is-success">Done</button>
                <span className="button" onClick={this.onCancel}>
                  Cancel
                </span>
              </footer>
            </form>
          </div>
        </div>
        {/* END OF PAYMENT MODAL */}

        {/* ACCOUNT MODAL */}
        <div
          className={classnames("modal", {
            "is-active": this.state.account_modal_is_visible,
          })}
        >
          <div className="modal-background" />
          <div className="modal-card">
            <form onSubmit={this.onAccountSubmit}>
              <header className="modal-card-head">
                <p className="modal-card-title">Enter Account</p>
                <button
                  className="delete"
                  aria-label="close"
                  onClick={this.onAccountSelectCancel}
                />
              </header>
              <section
                className="modal-card-body"
                style={{ minHeight: "30rem" }}
              >
                {this.state.errors.account && (
                  <div className="notification is-danger">
                    <button className="delete" />
                    {this.state.errors.account}
                  </div>
                )}

                <AutoSuggestFieldGroup
                  label="Account"
                  suggestions={this.state.account_suggestions}
                  onSuggestionsFetchRequested={
                    this.onAccountsSuggestionsFetchRequested
                  }
                  onSuggestionsClearRequested={
                    this.onAccountsSuggestionsClearRequested
                  }
                  onSuggestionSelected={this.onAccountsSuggestionSelected}
                  getSuggestionValue={this.onAccountsGetSuggestionValue}
                  renderSuggestion={this.onAccountsRenderSuggestion}
                  inputRef={(autosuggest) => (this.account_input = autosuggest)}
                  inputProps={{
                    placeholder: "Type Account Name",
                    name: "account_suggestion_name",
                    className: "input",
                    onChange: this.onAccountSuggestChange,
                    value: this.state.account_suggestion_name,
                  }}
                />
              </section>
              <footer className="modal-card-foot">
                <button className="button is-success">Save changes</button>
                <span className="button" onClick={this.onAccountSelectCancel}>
                  Cancel
                </span>
              </footer>
            </form>
          </div>
        </div>
        {/* END OF PAYMENT MODAL */}
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
  selectOrder,
  setManualDiscount,
  setTable,
})(withRouter(SplitBill));
