import React, { Component } from "react";
import { connect } from "react-redux";
import isEmpty from "../validation/is-empty";
import numeral from "numeral";
import OptionBillingButton from "../commons/OptionBillingButton";
import round from "../utils/round";
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
  selectOrder,
  setManualDiscount,
  setTable,
  removeTableTieup,
} from "./../actions/posActions";
import classnames from "classnames";
import axios from "axios";
import SeniorDiscountForm from "./SeniorDiscountForm";
import GiftCheckForm from "./GiftCheckForm";
import CreditCardForm from "./CreditCardForm";
import { Icon, message, Divider, Row, Col } from "antd";
import moment from "moment";
import UserLoginForm from "./UserLoginForm";
import AccountBillingForm from "./AccountBillingForm";
import OrdersSelectionModal from "./OrdersSelectionModal";
import CustomerInfoForm from "./CustomerInfoForm";
import InputModal from "./InputModal";
import { getTransactionSummary, getBreakdown } from "./../utils/computations";
import { wrap } from "lodash";

class Billing extends Component {
  state = {
    is_processing: false,
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
    payment_modal_is_visible: false,
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
    this.customerInfoForm = React.createRef();
    this.discountRateModal = React.createRef();
  }

  componentDidMount() {
    if (isEmpty(this.props.pos.table._id)) {
      this.props.history.push("/cashier-tables");
    } else {
      this.props.setTable(this.props.pos.table);
    }
  }

  getAccountBalance = (account) => {
    return new Promise((resolve, reject) => {
      axios
        .get(`/api/accounts/${account._id}/balance`)
        .then((response) => {
          if (response.data.balance) {
            resolve(response.data.balance);
          } else {
            resolve(0);
          }
        })
        .catch((err) => {
          reject(0);
        });
    });
  };

  computeSummary = () => {
    let total_amount = numeral(0);
    let credit_card_sales = numeral(0);
    let account_sales = numeral(0);
    let gift_check_sales = numeral(0);

    !isEmpty(this.props.pos.table.orders) &&
      this.props.pos.table.orders.forEach((order) => {
        order.items.forEach((item) => {
          total_amount.add(item.amount);
        });
      });

    let amount_due = numeral(total_amount);

    const payments = this.props.pos.table.payments;

    /**
     * PAYMENTS HERE
     */

    if (payments && payments.gift_checks && payments.gift_checks.length > 0) {
      payments.gift_checks.forEach((gift_check) => {
        gift_check_sales.add(gift_check.items.amount);
        amount_due.subtract(gift_check.items.amount);
      });
    }

    if (payments && payments.credit_cards && payments.credit_cards.length > 0) {
      payments.credit_cards.forEach((credit_card) => {
        credit_card_sales.add(credit_card.amount);
        amount_due.subtract(credit_card.amount);
      });
    }

    if (payments && payments.account && payments.account) {
      account_sales.add(payments.account.account_debit);
      amount_due.subtract(payments.account.account_debit);
    }

    let less_vat = 0;
    let less_sc_disc = 0;
    let less_disc = 0;
    if (
      !isEmpty(this.props.pos.table.summary) &&
      this.props.pos.table.summary.is_sc !== 0
    ) {
      const number_of_persons = !isEmpty(this.props.pos.table)
        ? this.props.pos.table.summary.number_of_persons
        : null;
      const number_of_seniors = !isEmpty(this.props.pos.table)
        ? this.props.pos.table.summary.seniors.length
        : null;

      /**
       * place code here to compute for the less vat
       */
      less_vat = round(
        ((total_amount.value() * number_of_seniors) /
          number_of_persons /
          1.12) *
          0.12
      );
      less_sc_disc = round(
        ((total_amount.value() / 1.12) * 0.2 * number_of_seniors) /
          number_of_persons
      );

      amount_due.subtract(less_vat);
      amount_due.subtract(less_sc_disc);
    } else if (
      !isEmpty(this.props.pos.table.summary) &&
      this.props.pos.table.summary.discount_rate > 0
    ) {
      less_disc = round(
        total_amount.value() * this.props.pos.table.summary.discount_rate
      );
      amount_due.subtract(less_disc);
    }

    if (!isEmpty(this.props.pos.table.account)) {
      amount_due.subtract(this.props.pos.table.account.account_debit);
    }

    const discount_rate =
      this.props.pos.table.summary && this.props.pos.table.summary.discount_rate
        ? this.props.pos.table.summary.discount_rate
        : 0;

    return {
      total_amount: total_amount.value(),
      amount_due: amount_due.value(),
      less_vat,
      less_sc_disc,
      less_disc,
      discount_rate,
      credit_card_sales: credit_card_sales.value(),
      account_sales: account_sales.value(),
      gift_check_sales: gift_check_sales.value(),
    };
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onBack = () => {
    this.props.history.push("/cashier-tables");
    //console.log(this.props.pos.table);
  };

  onPrintBilling = () => {
    let items = [];
    (this.props.pos?.table?.orders || []).forEach((order) => {
      (order?.items || []).forEach((item) => {
        items = [
          ...items,
          getBreakdown({
            item: item.product,
            price: item.price,
            quantity: item.quantity,
            line_discount_rate:
              this.props.pos.table?.summary?.discount_rate * 100 || 0,
            is_senior: this.props.pos.table?.summary?.is_sc || 0,
            seniors: this.props.pos?.table?.summary?.seniors || [],
            no_of_persons:
              this.props.pos.table?.summary?.number_of_persons || 0,
          }),
        ];
      });
    });

    const summary = {
      ...this.props.pos.table.summary,
      ...getTransactionSummary({ items }),
    };

    const payments = {
      ...this.props.pos.table.payments,
    };

    const user = this.props.auth.user;
    const loading = message.loading("Processing...");
    axios
      .post(`/api/tables/${this.props.pos.table._id}/print`, {
        summary,
        user,
        payments,
      })
      .then((response) => {
        loading();
        message.success("Bill Printed");
      })
      .catch((err) => {
        loading();
        message.error("There was an error printing your Bill");
      });
  };

  onSeniorDiscount = () => {
    this.props.history.push("/senior-billing-form");
  };

  onRemoveDiscount = () => {
    this.props.removeDiscount(this.props.pos.table);
  };

  onRemoveAccount = () => {
    this.props.removeAccount(this.props.pos.table);
  };

  onRemoveGiftCheck = (gift_check) => {
    let gift_checks = this.props.pos.table.payments.gift_checks.filter((gc) => {
      return (
        gc.items?.gift_check_number !== gift_check.items?.gift_check_number
      );
    });

    const table = {
      ...this.props.pos.table,
      payments: {
        ...this.props.pos.table.payments,
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
    let credit_cards = this.props.pos.table.payments.credit_cards.filter(
      (cc) => {
        return cc._id !== credit_card._id;
      }
    );

    const table = {
      ...this.props.pos.table,
      payments: {
        ...this.props.pos.table.payments,
        credit_cards,
      },
    };

    this.props.updateTable({ table });
  };

  onApplyDiscount = () => {
    this.props.history.push("/manual-discount-form");

    /* this.discountRateModal.current.open((discount_rate) => {
      this.userLoginForm.current.open((user) => {
        this.props.setManualDiscount({
          table: this.props.pos.table,
          history: this.props.history,
          discount_rate: parseInt(discount_rate),
          
        });
      });
    }); */
  };

  onDone = () => {
    const summary = this.computeSummary();
    const amount = round(summary.amount_due);
    this.props.processSale({
      table: this.props.pos.table,
      amount,
      history: this.props.history,
      summary,
      user: this.props.auth.user,
      print: false,
    });
    this.props.history.push("/cashier-tables");
  };

  onProcessPayment = () => {
    const summary = this.computeSummary();
    if (round(summary.amount_due) <= 0) {
      this.props.processSale({
        table: this.props.pos.table,
        amount: 0,
        history: this.props.history,
        summary,
        user: this.props.auth.user,
      });
      this.props.history.push("/change");
    } else {
      this.setState(
        {
          payment_modal_is_visible: true,
        },
        () => {
          this.input_amount.focus();
        }
      );
    }
  };

  onSelectAccount = () => {
    this.accountBillingForm.current.open(async (account) => {
      await this.setState({
        account: account,
      });

      const { amount_due } = this.computeSummary();

      this.getAccountBalance(this.state.account).then((balance) => {
        let account_debit = 0;
        if (balance) {
          account_debit = amount_due > balance ? balance : amount_due;
        }

        const account = {
          ...this.state.account,
          account_debit,
        };

        this.props.setAccount({ account, table: this.props.pos.table });
      });
    });
  };

  onCancel = () => {
    this.setState({
      payment_modal_is_visible: false,
    });
  };

  /**
   * ON PROCESS SALE
   */
  onSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (isEmpty(this.state.amount)) {
      message.error("Invalid amount");
      return;
    }

    const summary = this.computeSummary();

    if (round(summary.amount_due) > round(this.state.amount)) {
      errors.amount = "Invalid Amount";

      this.setState(
        {
          errors,
        },
        () => this.input_amount.focus()
      );
    } else {
      if (this.state.is_processing) {
        return;
      }
      this.setState(
        {
          is_processing: true,
        },
        () => {
          const loading = message.loading("Processing...");
          this.props
            .processSale({
              table: this.props.pos.table,
              amount: this.state.amount,
              history: this.props.history,
              summary,
              user: this.props.auth.user,
            })
            .then((sale) => {
              loading();
              this.setState({ is_processing: false });
              this.props.history.push("/change");
            })
            .catch((err) => {
              loading();
              message.error("There was an error processing your request");
              this.setState({ is_processing: false });
            });
        }
      );
    }
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
      this.props.setAccount({ account, table: this.props.pos.table });
      this.onAccountSelectCancel();
    });
  };

  onAddGiftCheck = () => {
    this.giftCheckForm.current.open((gift_check) => {
      this.props.addGiftCheck({
        table: this.props.pos.table,
        gift_check,
      });
    });
  };

  onAddCreditCard = () => {
    this.creditCardForm.current.open((credit_card) => {
      this.props.addCreditCard({
        table: this.props.pos.table,
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

  onOrdersReprint = () => {
    this.ordersSelectionModal.current.open(
      () => {
        message.success("Order Reprinted");
      },
      { orders: [...this.props.pos.table.orders], table: this.props.pos.table }
    );
  };

  onSplitBill = () => {
    this.props.history.push("/split-bill");
  };

  onRemoveCustomer = () => {
    const table = {
      ...this.props.pos.table,
      customer: {
        name: "",
        address: "",
        tin: "",
        business_style: "",
      },
    };

    this.props.updateTable({ table });
  };

  onCustomerInfo = () => {
    this.customerInfoForm.current.open((customer) => {
      message.success("Customer Information Updated");

      const table = {
        ...this.props.pos.table,
        customer,
      };

      this.props.updateTable({ table });
    });
  };

  onCashiering = () => {
    if (this.props.pos.table) {
      this.props.history.push(`/cashier/${this.props.pos.table._id}`);
    } else {
      message.error("Unable to process your request");
    }
  };

  onRemoveTieup = () => {
    this.props.removeTableTieup({ table: this.props.pos.table });
  };

  render() {
    const is_authenticated = this.props.auth.isAuthenticated;
    let overall_orders = [];
    if (this.props.pos.table.orders) {
      this.props.pos.table.orders.forEach((order) => {
        order.items.forEach((item) => {
          const o = {
            item: { ...item },
            user: order.user,
            datetime: order.datetime,
            order_id: order.order_id,
          };
          overall_orders = [...overall_orders, o];
        });
      });
    }

    /* const {
      amount_due = 0,
      less_vat = 0,
      less_sc_disc = 0,
      less_disc = 0,
    } = this.computeSummary(); */

    let items = [];
    (this.props.pos?.table?.orders || []).forEach((order) => {
      (order?.items || []).forEach((item) => {
        items = [
          ...items,
          getBreakdown({
            item: item.product,
            price: item.price,
            quantity: item.quantity,
            line_discount_rate:
              this.props.pos.table?.summary?.discount_rate * 100 || 0,
            is_senior: this.props.pos.table?.summary?.is_sc || 0,
            seniors: this.props.pos?.table?.summary?.seniors || [],
            no_of_persons:
              this.props.pos.table?.summary?.number_of_persons || 0,
          }),
        ];
      });
    });

    const {
      net_amount: amount_due,
      less_vat,
      less_sc_disc,
      discount_amount: less_disc,
    } = getTransactionSummary({ items });

    return (
      <div className="pad-container   container-is-fullheight">
        <SeniorDiscountForm ref={this.seniorDiscountForm} />
        <GiftCheckForm ref={this.giftCheckForm} />
        <AccountBillingForm
          ref={this.accountBillingForm}
          accountBillingField={this.accountBillingField}
        />
        <OrdersSelectionModal ref={this.ordersSelectionModal} />
        <InputModal
          title="Discount"
          placeholder="Discounte Rate"
          ref={this.discountRateModal}
        />
        <CreditCardForm ref={this.creditCardForm} />
        <UserLoginForm ref={this.userLoginForm} />
        <CustomerInfoForm ref={this.customerInfoForm} />
        <div className="columns container-is-fullheight">
          <div className="column is-9 columns flex-column container-is-fullheight">
            <div
              className="flex-1 bg-white pad-container"
              style={{ overflow: "auto" }}
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
                  {this.props.pos.table.name}
                </span>
              </div>

              {this.props.pos.table?.tieup_information?.tieup?.name && [
                <Row key="tie-up">
                  <Col span={4}>Tie-up:</Col>
                  <Col span={20} className="has-text-weight-bold">
                    {this.props.pos.table?.tieup_information?.tieup?.name}
                  </Col>
                </Row>,
                <Row key="booking-reference">
                  <Col span={4}>Booking Reference:</Col>
                  <Col span={20} className="has-text-weight-bold">
                    {this.props.pos.table?.tieup_information?.booking_reference}
                  </Col>
                </Row>,
              ]}

              <table className="is-fullwidth table m-t-1">
                <thead>
                  <tr>
                    <th>QTY</th>
                    <th>PRODUCT</th>
                    {(is_authenticated || true) && [
                      <th key="price" className="has-text-right">
                        PRICE
                      </th>,
                      <th key="amount" className="has-text-right">
                        AMOUNT
                      </th>,
                    ]}
                  </tr>
                </thead>
                <tbody>
                  {overall_orders.map((order, i) => (
                    <tr key={i} onClick={() => this.onUpdateOrder(order, i)}>
                      <td>{order.item.quantity}</td>
                      <td>
                        <div className="has-text-weight-bold">
                          {order.item.product.name}
                        </div>{" "}
                        {order.item.product.is_gift_check &&
                          order.item.product.gc_reference && (
                            <div className="is-small">
                              {" "}
                              GC #{order.item.product.gc_reference}
                            </div>
                          )}
                        {!isEmpty(order.item.remarks) && (
                          <div className="is-small">
                            Remarks: {order.item.remarks}
                          </div>
                        )}
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
                        <div style={{ fontSize: "10px", fontStyle: "italic" }}>
                          OS # {order.order_id} <Divider type="vertical" />
                          {moment(order.datetime).format("lll")}{" "}
                          <Divider type="vertical" /> Waiter:{" "}
                          {order.user && order.user.name}
                        </div>
                      </td>
                      {(is_authenticated || true) && [
                        <td key="price" className="has-text-right">
                          {numeral(order.item.price).format("0,0.00")}
                        </td>,
                        <td key="amount" className="has-text-right">
                          {numeral(order.item.amount).format("0,0.00")}
                        </td>,
                      ]}
                    </tr>
                  ))}

                  {this.props.pos.table &&
                    this.props.pos.table.payments &&
                    !isEmpty(this.props.pos.table.payments) &&
                    this.props.pos.table.payments.gift_checks &&
                    this.props.pos.table.payments.gift_checks.map(
                      (gift_check) => (
                        <tr
                          key={gift_check._id}
                          onClick={() => this.onRemoveGiftCheck(gift_check)}
                        >
                          <td />
                          <td>
                            <Icon
                              type="gift"
                              style={{ color: "rgba(0,0,0,.25)" }}
                            />{" "}
                            GC#{gift_check.items?.gift_check_number}
                          </td>
                          <td />
                          <td className="has-text-right">
                            ({numberFormat(gift_check.items?.amount)})
                          </td>
                        </tr>
                      )
                    )}

                  {this.props.pos.table &&
                    this.props.pos.table.payments &&
                    !isEmpty(this.props.pos.table.payments) &&
                    this.props.pos.table.payments.credit_cards &&
                    this.props.pos.table.payments.credit_cards.map(
                      (credit_card, index) => (
                        <tr
                          key={index}
                          onClick={() => this.onRemoveCreditCard(credit_card)}
                        >
                          <td />
                          <td>
                            <Icon
                              type="credit-card"
                              style={{ color: "rgba(0,0,0,.25)" }}
                            />{" "}
                            {credit_card.card}
                          </td>
                          <td />
                          <td className="has-text-right">
                            ({numberFormat(credit_card.amount)})
                          </td>
                        </tr>
                      )
                    )}

                  {this.props.pos.table &&
                    this.props.pos.table.payments &&
                    !isEmpty(this.props.pos.table.payments) &&
                    this.props.pos.table.payments.account &&
                    !isEmpty(this.props.pos.table.payments.account) && (
                      <tr>
                        <td />
                        <td>
                          <Icon
                            type="user"
                            style={{ color: "rgba(0,0,0,.25)" }}
                          />{" "}
                          {this.props.pos.table.payments.account.name}
                        </td>
                        <td />
                        <td className="has-text-right">
                          (
                          {numberFormat(
                            this.props.pos.table.payments.account.account_debit
                          )}
                          )
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
            {this.props.pos.table.customer &&
              this.props.pos.table.customer.name && (
                <div
                  className="card"
                  style={{
                    margin: "1vw",
                    padding: "1vw",
                  }}
                >
                  <div className="module-heading">CUSTOMER</div>
                  <table className="table full-width">
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th>ADDRESS</th>
                        <th>CONTACT NO.</th>
                        <th>TIN</th>
                        <th>BUSINESS STYLE</th>
                        <th>TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{this.props.pos.table?.customer?.name}</td>
                        <td>{this.props.pos.table?.customer?.address}</td>
                        <td>{this.props.pos.table?.customer?.contact_no}</td>
                        <td>{this.props.pos.table?.customer?.tin}</td>
                        <td>
                          {this.props.pos.table?.customer?.business_style}
                        </td>
                        <td>{this.props.pos.table?.customer?.time}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            {this.props.pos.table.summary &&
              this.props.pos.table.summary.seniors &&
              this.props.pos.table.summary.seniors.length > 0 && (
                <div
                  className="card"
                  style={{
                    margin: "1vw",
                    padding: "1vw",
                  }}
                >
                  <div className="module-heading">SENIOR/PWD</div>
                  <div
                    className="has-text-centered"
                    style={{ fontStyle: "italic" }}
                  >
                    {this.props.pos.table.summary.number_of_persons} persons
                  </div>

                  <table className="table full-width">
                    <tbody>
                      <tr>
                        <th>OSACA/PWD ID</th>
                        <th>SENIOR/PWD NAME</th>
                        <th>SENIOR/PWD TIN</th>
                      </tr>
                      {this.props.pos.table.summary.seniors.map(
                        (senior, index) => (
                          <tr key={index}>
                            <td>{senior.senior_number}</td>
                            <td>{senior.senior_name}</td>
                            <td>{senior.senior_tin}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            <div className="pad-container bg-white">
              <table className="table is-fullwidth">
                <tbody>
                  {!isEmpty(this.props.pos.table.summary) &&
                    this.props.pos.table.summary.is_sc === 1 && (
                      <tr>
                        <td className="has-text-right">Less Vat</td>
                        <td className="has-text-right">
                          {numeral(less_vat).format("0,0.00")}
                        </td>
                      </tr>
                    )}

                  {!isEmpty(this.props.pos.table.summary) &&
                    this.props.pos.table.summary.is_sc === 1 && (
                      <tr>
                        <td className="has-text-right">Less S.C. Disc.</td>
                        <td className="has-text-right">
                          {numeral(less_sc_disc).format("0,0.00")}
                        </td>
                      </tr>
                    )}

                  {!isEmpty(this.props.pos.table.summary) &&
                    this.props.pos.table.summary.discount_rate > 0 && (
                      <tr>
                        <td className="has-text-right">Less Disc.</td>
                        <td className="has-text-right">
                          {numeral(less_disc).format("0,0.00")}
                        </td>
                      </tr>
                    )}

                  {this.props.pos.table.account && (
                    <tr>
                      <td className="has-text-right">
                        {this.props.pos.table.account &&
                          this.props.pos.table.account.name}
                      </td>
                      <td className="has-text-right">
                        -{" "}
                        {this.props.pos.table.account &&
                          numberFormat(
                            this.props.pos.table.account.account_debit
                          )}
                      </td>
                    </tr>
                  )}

                  {(is_authenticated || true) && (
                    <tr>
                      <td className="has-text-right">Amount Due</td>
                      <td
                        className="has-text-right"
                        style={{ fontSize: "24px", fontWeight: "bold" }}
                      >
                        {numeral(round(amount_due)).format("0,0.00")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div
            className="is-flex"
            style={{
              padding: "1rem",
            }}
          >
            <div className="is-flex align-content-start flex-wrap">
              <OptionBillingButton
                label="Back"
                icon="fas fa-angle-left"
                onClick={this.onBack}
              />
              <OptionBillingButton
                key="print-bill"
                label="Print Bill"
                icon="fas fa-file-invoice-dollar"
                onClick={this.onPrintBilling}
              />
              <OptionBillingButton
                key="reprint-orders"
                label="Reprint Orders"
                icon="fas fa-receipt"
                onClick={this.onOrdersReprint}
              />
              ,
              {is_authenticated && [
                ((this.props.pos.table?.summary?.is_sc === 0 &&
                  this.props.pos.table?.summary?.discount_rate === 0) ||
                  isEmpty(this.props.pos?.table?.summary)) && (
                  <OptionBillingButton
                    key="apply-sc-disc"
                    label="Apply SC Disc"
                    icon="fas fa-wheelchair"
                    onClick={this.onSeniorDiscount}
                  />
                ),

                ((this.props.pos.table?.summary?.is_sc === 0 &&
                  this.props.pos.table?.summary?.discount_rate === 0) ||
                  isEmpty(this.props.pos.table?.summary)) && (
                  <OptionBillingButton
                    key="personal-disc"
                    label="Apply Discount"
                    icon="fas fa-minus"
                    onClick={this.onApplyDiscount}
                  />
                ),
                !isEmpty(this.props.pos.table.summary) &&
                  (this.props.pos.table.summary.is_sc === 1 ||
                    this.props.pos.table.summary.discount_rate > 0) && (
                    <OptionBillingButton
                      key="remove-disc"
                      label="Remove Disc"
                      icon="fas fa-times"
                      onClick={this.onRemoveDiscount}
                    />
                  ),
                <OptionBillingButton
                  key="split-bill"
                  label="Split Bill"
                  icon="fas fa-columns"
                  onClick={this.onSplitBill}
                />,

                false &&
                  isEmpty(
                    this.props.pos.table?.tieup_information?.tieup?.name
                  ) && (
                    <OptionBillingButton
                      key="tieup"
                      label="Select Tie-up"
                      icon="fas fa-motorcycle"
                      onClick={() => this.props.history.push("/select-tieup")}
                    />
                  ),
                false &&
                  this.props.pos.table?.tieup_information?.tieup?.name && (
                    <OptionBillingButton
                      key="remove-tieup"
                      label="Remove Tie-up"
                      icon="fas fa-times"
                      onClick={() => this.onRemoveTieup()}
                    />
                  ),
                <OptionBillingButton
                  key="bill-out"
                  label="Bill Out"
                  icon="fas fa-money-bill"
                  onClick={this.onCashiering}
                />,
              ]}
              {/* {!is_authenticated && [
                <OptionBillingButton
                  label="Done"
                  icon="fas fa-check"
                  onClick={this.onDone}
                />
              ]} */}
            </div>
          </div>
        </div>

        {/* PAYMENT MODAL */}
        <div
          className={classnames("modal", {
            "is-active": this.state.payment_modal_is_visible,
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
  removeTableTieup,
})(withRouter(Billing));
