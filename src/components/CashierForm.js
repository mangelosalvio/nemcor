import React, { Component } from "react";
import { connect } from "react-redux";
import { withParams } from "./../utils/hoc";
import isEmpty from "../validation/is-empty";
import round from "../utils/round";
import numberFormat from "../utils/numberFormat";
import axios from "axios";

import { message, Input, Row, Col, Table } from "antd";
import UserLoginForm from "./UserLoginForm";
import ProductOrderForm from "./ProductOrderForm";

import InputModal from "./InputModal";

import SearchProductModal from "./SearchProductModal";
import CustomerInfoModal from "./CustomerInfoModal";
import {
  SOCKET_ENDPOINT,
  USER_ADMIN,
  USER_OWNER,
  USER_SUPERVISOR,
} from "../utils/constants";
import { logoutUser } from "./../actions/authActions";
import { reset } from "./../actions/posActions";
import CreditCardForm from "./CreditCardForm";
import ReturnForm from "./ReturnForm";
import SearchTableModal from "./SearchTableModal";
import socketIoClient from "socket.io-client";
import SeniorDiscountModal from "./SeniorDiscountModal";
import { getBreakdown, getTransactionSummary } from "./../utils/computations";
import { getCustomerPrice } from "../utils/functions";
import CheckModalForm from "./CheckModalForm";
import { addKeysToArray } from "./utils/utilities";
import moment from "moment";
import OnlinePaymentModalForm from "./OnlinePaymentModalForm";
import FreeOfChargePaymentModalForm from "./FreeOfChargePaymentModalForm";
import ChargeToAccountModalForm from "./ChargeToAccountModalForm";
import GiftCheckForm from "./GiftCheckForm";
import CashCountForm from "./CashCountForm";
import { ITEM } from "../actions/types";
import async from "async";
import validator from "validator";
import KeyboardEventHandler from "react-keyboard-event-handler";
import SearchSuspendedSalesModal from "./SearchSuspendedSalesModal";
import SelectOrderModal from "./modals/SelectOrderModal";

let processing = false;
const default_form_data = {
  sales_order_id: null,
  suspended_sale: null,
  input: "",
  payments: {
    credit_cards: [],
    cash: 0,
    checks: [],
    online_payments: [],
    free_of_charge_payments: [],
    charge_to_accounts: [],
    gift_checks: [],

    credit_card_total: 0,
    online_payments_total: 0,
    free_of_charge_payments_total: 0,
    charge_to_accounts_total: 0,
    gift_checks_total: 0,
  },
  items: [],
  selected_item_index: 0,
  customer: {},
  discount_rate: 0,
  is_senior: false,
  seniors: [],
  summary: {
    subtotal: 0,
    no_of_items: 0,
    vatable_amount: 0,
    vat_amount: 0,
    vat_exempt: 0,
    zero_rated: 0,
    discount_amount: 0,
    net_amount: 0,
    total_returns: 0,
  },
  amount_due_label: "AMOUNT DUE",
  change: null,
  table: null,
};

let socket;

class CashierForm extends Component {
  state = {
    ...default_form_data,
    amount_due_label: "AMOUNT DUE",
    change: null,
  };

  constructor(props) {
    super(props);
    this.userLoginForm = React.createRef();
    this.productOrderForm = React.createRef();
    this.gcReferenceModal = React.createRef();
    this.tableRef = React.createRef();
    this.searchProductModal = React.createRef();
    this.searchTableModal = React.createRef();
    this.inputRef = React.createRef();
    this.discountRateModal = React.createRef();
    this.customerInfoModal = React.createRef();
    this.seniorDiscountModal = React.createRef();
    this.creditCardForm = React.createRef();
    this.onlinePaymentModalForm = React.createRef();
    this.checkModalForm = React.createRef();
    this.cashCountModalForm = React.createRef();
    this.freeOfChargeModalForm = React.createRef();
    this.chargeToAccountModalForm = React.createRef();
    this.giftCheckModalForm = React.createRef();
    this.returnForm = React.createRef();
    this.voidSaleReasonModal = React.createRef();
    this.searchSuspendedSalesModal = React.createRef();
    this.selectOrderModal = React.createRef();
  }

  componentDidMount() {
    if (!this.props.auth.isAuthenticated) {
      this.props.navigate("/");
    }

    socket = socketIoClient(SOCKET_ENDPOINT);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.items !== this.state.items ||
      prevState.discount_rate !== this.state.discount_rate ||
      prevState.is_senior !== this.state.is_senior ||
      prevState.payments?.credit_cards !== this.state.payments?.credit_cards ||
      prevState.payments?.checks !== this.state.payments?.checks ||
      prevState.payments?.online_payments !==
        this.state.payments?.online_payments ||
      prevState.payments?.free_of_charge_payments !==
        this.state.payments?.free_of_charge_payments ||
      prevState.payments?.charge_to_accounts !==
        this.state.payments?.charge_to_accounts ||
      prevState.payments?.gift_checks !== this.state.payments?.gift_checks
    ) {
      const {
        subtotal,
        no_of_items,
        vatable_amount,
        vat_amount,
        vat_exempt_amount,
        zero_rated_amount,
        non_vatable_amount,
        discount_amount,
        net_amount,
        less_vat,
        less_sc_disc,
        total_returns,
        net_of_returns,
        credit_card_total,
        online_payments_total,
        checks_total,
        free_of_charge_payments_total,
        charge_to_accounts_total,
        gift_checks_total,
        amount_due,
      } = getTransactionSummary({
        items: this.state.items || [],
        payments: this.state.payments || [],
      });

      this.setState({
        payments: {
          ...this.state.payments,
          credit_card_total,
          checks_total,
          online_payments_total,
          free_of_charge_payments_total,
          charge_to_accounts_total,
          gift_checks_total,
        },
        summary: {
          subtotal,
          no_of_items,
          vatable_amount,
          vat_amount,
          vat_exempt_amount,
          zero_rated_amount,
          non_vatable_amount,
          discount_amount,
          net_amount,
          less_vat,
          less_sc_disc,
          total_returns,
          net_of_returns,
          amount_due,
          credit_card_total,
          checks_total,
          online_payments_total,
          free_of_charge_payments_total,
          charge_to_accounts_total,
          gift_checks_total,
        },
      });
    }
  }

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onBack = () => {
    this.props.clearOrders();
    this.props.navigate("/cashier-tables");
  };

  focusInput = () => {
    if (this.inputRef.current) {
      this.inputRef.current.focus();
    }
  };

  onKeyDown = (e) => {
    /* console.log(e.shiftKey);
    console.log(e.key); */

    if (e.key === "ArrowUp") {
      this.onArrowUp();
    } else if (e.key === "ArrowDown") {
      this.onArrowDown();
    } else if (e.key === "F1") {
      e.preventDefault();
      this.props.logoutUser();
      this.props.navigate("/");
    } else if (e.key === "F2") {
      e.preventDefault();
      this.onReprint();
    } else if (e.shiftKey && e.key === "F3") {
      e.preventDefault();
      // this.onSearchTable();
    } else if (e.key === "F3") {
      e.preventDefault();
      this.onSearchItem();
    } else if (e.shiftKey && e.key === "F4") {
      e.preventDefault();
      this.onVoidSale();
    } else if (e.key === "F4") {
      e.preventDefault();
      /* if (!isEmpty(this.state.table)) {
        message.error("Unable to delete item");
        return;
      } */
      this.onDeleteItem();
    } else if (e.key === "F5") {
      e.preventDefault();
      this.onChangePrice();
    } else if (e.key === "F6") {
      e.preventDefault();
      if (!isEmpty(this.state.table)) {
        message.error("Unable to change quantity");
        return;
      }
      this.onChangeQuantity();
    } else if (e.shiftKey && e.key === "F7") {
      e.preventDefault();
      // this.onApplyLineSeniorDiscount();
    } else if (e.key === "F7") {
      e.preventDefault();
      //this.onApplyLineDiscountRate();
      this.onSearchSuspendedSale();
    } else if (e.shiftKey && e.key === "F8") {
      e.preventDefault();
      // this.onApplyGlobalSeniorDiscount();
    } else if (e.key === "F8") {
      e.preventDefault();
      this.onApplyLineDiscountValue();
    } else if (e.ctrlKey && e.shiftKey && e.key === "F9") {
      e.preventDefault();
      this.onSetCustomerInfo();
      // this.onAddCreditCard();
    } else if (e.key === "F9") {
      e.preventDefault();
      // this.onSetCustomerInfo();
      this.onChangePrice();
    } else if (e.key === "F10") {
      e.preventDefault();
      this.onFinish();
    } else if (e.shiftKey && e.key === "F11") {
      /* this.onZread(); */
    } else if (e.key === "F11") {
      /* this.onXread(); */
    } else if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
      this.onDailySalesInventoryReport();
    } else if (e.ctrlKey && e.shiftKey && e.key === "D") {
      e.preventDefault();
      this.onSuspendSale();
    } else if (e.ctrlKey && e.shiftKey && e.key === "Y") {
      e.preventDefault();
      this.onSearchSuspendedSale();
    } else if (e.ctrlKey && e.shiftKey && e.key === "X") {
      e.preventDefault();
      this.onSuspendSaleDelete();
    } else if (e.ctrlKey && e.shiftKey && e.key === "L") {
      e.preventDefault();
      this.onPrintPhysicalCountForm();
    } else if (e.ctrlKey && e.shiftKey && e.key === "V") {
      e.preventDefault();
      this.onRemoveDiscounts();
    } else if (e.ctrlKey && e.shiftKey && e.key === "O") {
      e.preventDefault();
      this.selectOrderModal.current.open();
    }

    return false;
  };

  onFinish = async () => {
    if (this.state.items.length <= 0) {
      message.error("No items to process");
      return;
    }

    /* let payment_amount = isEmpty(this.state.input)
      ? this.state.summary.amount_due
      : this.state.input; */

    let payment_amount = isEmpty(this.state.input) ? 0 : this.state.input;

    if (this.state.summary.amount_due < 0) {
      message.error("Unable to process negative amount");
      return;
    }

    if (this.state.summary.amount_due > payment_amount) {
      message.error("Invalid amount");
      return;
    }

    const has_zread = await this.hasZread();

    if (has_zread) {
      message.error(
        "Unable to make new process sale. Zread already processed."
      );
      return;
    }

    let change = round(payment_amount - this.state.summary.amount_due);

    const form_data = {
      items: this.state.items,
      summary: {
        ...this.state.summary,
        payment_amount,
        change,
      },
      payments: {
        ...this.state.payments,
        cash: this.state.summary.amount_due,
      },
      is_senior: this.state.is_senior,
      customer: this.state.customer,
      user: this.props.auth.user,
      table: this.state.table,
      tieup_information: this.state.table?.tieup_information,
      suspended_sale: this.state.suspended_sale,
      sales_order_id: this.state.sales_order_id,
      seller: this.state?.seller,
    };
    const loading = message.loading("Processing...");

    if (processing) {
      message.error("Please wait for a moment to finish sale.");
      return;
    }

    processing = true;
    axios
      .put("/api/sales", form_data)
      .then((response) => {
        processing = false;
        loading();

        if (!isEmpty(this.state.table)) {
          socket.emit("refresh_table", true);
        }

        this.setState({
          ...default_form_data,
          amount_due_label: "CHANGE",
          change,
        });
        this.props.reset();
      })
      .catch((err) => {
        processing = false;
        loading();
        message.error("There was an error processing your request.");
      });
  };

  onSuspendSaleDelete = () => {
    if (this.state?.suspended_sale?._id) {
      axios
        .delete(`/api/sales/${this.state.suspended_sale._id}/suspended-sale`)
        .then(() => {
          this.setState({
            ...default_form_data,
            amount_due_label: "AMOUNT DUE",
            change: null,
          });

          message.success("Suspended Sale Voided");
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      message.warn("No Suspended Sale to Void");
    }
  };

  onPrintBill = async () => {
    if (this.state.items.length <= 0) {
      message.error("No items to process");
      return;
    }

    const form_data = {
      items: this.state.items,
      summary: {
        ...this.state.summary,
      },
      payments: {
        ...this.state.payments,
      },
      is_senior: this.state.is_senior,
      customer: this.state.customer,
      user: this.props.auth.user,
      table: this.state.table,
      tieup_information: this.state.table?.tieup_information,
    };
    const loading = message.loading("Processing...");

    if (processing) {
      message.error("Please wait for a moment to finish sale.");
      return;
    }

    processing = true;
    axios
      .put("/api/sales/bill", form_data)
      .then((response) => {
        processing = false;
        loading();
        this.focusInput();
      })
      .catch((err) => {
        processing = false;
        loading();
        this.focusInput();
        message.error("There was an error processing your request.");
      });
  };

  onSuspendSale = async () => {
    const table = this.state.table;
    if (this.state.items.length <= 0) {
      message.error("No items to process");
      return;
    }

    const form_data = {
      items: this.state.items,
      summary: {
        ...this.state.summary,
      },
      payments: {
        ...this.state.payments,
      },
      customer: this.state.customer,
      user: this.props.auth.user,
      seller: this.state.suspended_sale?.seller || null,
      queue_no: this.state.suspended_sale?.queue_no,
    };
    const loading = message.loading("Processing...");

    if (processing) {
      message.error("Please wait ...");
      return;
    }

    processing = true;
    axios
      .put("/api/sales/suspend-sale", form_data)
      .then((response) => {
        message.success("Sale Suspended");
        processing = false;
        loading();
        this.focusInput();
        this.setState({
          ...default_form_data,
          amount_due_label: "AMOUNT DUE",
          change: null,
        });
      })
      .catch((err) => {
        processing = false;
        loading();
        this.focusInput();
        message.error("There was an error processing your request.");
      });
  };

  onDailySalesInventoryReport = () => {
    axios
      .post(`/api/sales/daily-sales-inventory-report`, {
        user: this.props.auth.user,
        input: this.state.input,
      })
      .then((response) => {
        this.setState({
          input: "",
        });
        message.success("DSIR Printed");
      })
      .catch((err) => message.error("There was an error processing DSIR"));
  };

  onPrintPhysicalCountForm = () => {
    axios
      .post(`/api/sales/physical-count-form`, {
        user: this.props.auth.user,
        input: this.state.input,
      })
      .then((response) => {
        this.setState({
          input: "",
        });
        message.success("Physical Count Form Printed");
      })
      .catch((err) =>
        message.error("There was an error processing Physical Count Form")
      );
  };

  onPrintOrderSlip = async () => {
    if (this.state.items.length <= 0) {
      message.error("No items to process");
      return;
    }

    const form_data = {
      items: this.state.items,
      summary: {
        ...this.state.summary,
      },
      payments: {
        ...this.state.payments,
      },
      is_senior: this.state.is_senior,
      customer: this.state.customer,
      user: this.props.auth.user,
      table: this.state.table,
      tieup_information: this.state.table?.tieup_information,
    };
    const loading = message.loading("Processing...");

    if (processing) {
      message.error("Please wait for a moment to finish sale.");
      return;
    }

    processing = true;
    axios
      .put("/api/sales/order-slip", form_data)
      .then((response) => {
        this.focusInput();
        processing = false;
        loading();
      })
      .catch((err) => {
        processing = false;
        loading();
        this.focusInput();
        message.error("There was an error processing your request.");
      });
  };

  onSetCustomerInfo = () => {
    this.customerInfoModal.current.open((customer) => {
      this.setState({
        customer,
      });
      this.focusInput();
    });
  };

  onSearchItem = () => {
    this.searchProductModal.current.open(() => {
      this.inputRef.current.focus();
    });
    this.setState({
      amount_due_label: "AMOUNT DUE",
    });
  };

  onSearchTable = () => {
    this.searchTableModal.current.open(() => {
      this.inputRef.current.focus();
    });
    this.setState({
      amount_due_label: "AMOUNT DUE",
    });
  };

  onSearchSuspendedSale = () => {
    this.searchSuspendedSalesModal.current.open(() => {
      this.inputRef.current.focus();
    });
    this.setState({
      amount_due_label: "AMOUNT DUE",
    });
  };

  onDeleteItem = () => {
    let payments = {
      ...this.state.payments,
    };

    if (this.state.selected_item_index < this.state.items.length) {
      let items = [...this.state.items];
      const item = items[this.state.selected_item_index];
      let selected_item_index = this.state.selected_item_index;

      if (!isEmpty(item?.order)) {
        message.error(
          "Unable to delete order. Please cancel in the ordering module"
        );
      } else {
        items.splice(this.state.selected_item_index, 1);

        if (selected_item_index > items.length - 1) {
          selected_item_index = items.length - 1;
        }

        // message.success("Successfully deleted order");
      }

      this.setState({
        items,
        selected_item_index: selected_item_index < 0 ? 0 : selected_item_index,
      });
    } else if (
      this.state.selected_item_index <
      this.state.items.length + this.state.payments.credit_cards.length
    ) {
      //credit cart payments
      const index = this.state.selected_item_index - this.state.items.length;

      const credit_card_payments = [...this.state.payments.credit_cards];
      credit_card_payments.splice(index, 1);

      payments = {
        ...payments,
        credit_cards: credit_card_payments,
      };
    } else if (
      this.state.selected_item_index <
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length
    ) {
      //checks payment
      const index =
        this.state.selected_item_index -
        this.state.items.length -
        this.state.payments.credit_cards.length;

      const check_payments = [...this.state.payments.checks];
      check_payments.splice(index, 1);

      payments = {
        ...payments,
        checks: check_payments,
      };
    } else if (
      this.state.selected_item_index <
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length +
        this.state.payments.online_payments.length
    ) {
      //online payment
      const index =
        this.state.selected_item_index -
        this.state.items.length -
        this.state.payments.credit_cards.length -
        this.state.payments.checks.length;

      const online_payments = [...this.state.payments.online_payments];
      online_payments.splice(index, 1);

      payments = {
        ...payments,
        online_payments,
      };
    } else if (
      this.state.selected_item_index <
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length +
        this.state.payments.online_payments.length +
        this.state.payments.free_of_charge_payments.length
    ) {
      // free of charge payments
      const index =
        this.state.selected_item_index -
        this.state.items.length -
        this.state.payments.credit_cards.length -
        this.state.payments.checks.length -
        this.state.payments.online_payments.length;

      const free_of_charge_payments = [
        ...this.state.payments.free_of_charge_payments,
      ];
      free_of_charge_payments.splice(index, 1);

      payments = {
        ...payments,
        free_of_charge_payments,
      };
    } else if (
      this.state.selected_item_index <
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length +
        this.state.payments.online_payments.length +
        this.state.payments.free_of_charge_payments.length +
        this.state.payments.charge_to_accounts.length
    ) {
      // charge to accounts
      const index =
        this.state.selected_item_index -
        this.state.items.length -
        this.state.payments.credit_cards.length -
        this.state.payments.checks.length -
        this.state.payments.online_payments.length -
        this.state.payments.free_of_charge_payments.length;

      const charge_to_accounts = [...this.state.payments.charge_to_accounts];
      charge_to_accounts.splice(index, 1);

      payments = {
        ...payments,
        charge_to_accounts,
      };
    } else if (
      this.state.selected_item_index <
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length +
        this.state.payments.online_payments.length +
        this.state.payments.free_of_charge_payments.length +
        this.state.payments.charge_to_accounts.length +
        this.state.payments.gift_checks.length
    ) {
      // gift checks
      const index =
        this.state.selected_item_index -
        this.state.items.length -
        this.state.payments.credit_cards.length -
        this.state.payments.checks.length -
        this.state.payments.online_payments.length -
        this.state.payments.free_of_charge_payments.length -
        this.state.payments.charge_to_accounts.length;

      const gift_checks = [...this.state.payments.gift_checks];
      const item = this.state.payments.gift_checks[index];
      gift_checks.splice(index, 1);

      payments = {
        ...payments,
        gift_checks,
      };

      axios
        .post("/api/gift-checks/unuse", {
          gift_check_id: item.gift_check.items._id,
        })
        .then(() => {
          message.success("Gift check removed successfully");
        });
    }

    this.setState({
      payments,
    });

    if (this.state.table?._id) {
      const form_data = {
        _id: this.state.table._id,
        payments,
      };
      axios
        .post(`/api/tables/${this.state.table._id}/update`, {
          table: form_data,
        })
        .then((response) => {})
        .catch((err) =>
          message.error("There was an error deleting selected item")
        );
    }
    this.focusInput();
  };

  onChangePrice = () => {
    if (isEmpty(this.state.input)) {
      message.error("Please enter price");
      this.focusInput();
      return;
    }

    this.userLoginForm.current.open(
      (user) => {
        const price = parseFloat(this.state.input);
        const item_index = this.state.selected_item_index;
        let items = [...this.state.items];
        let item = items[item_index];

        const product = {
          ...item.product,
          price,
        };

        const new_item = this.onAddItem({
          item: product,
          quantity: item.quantity,
          price: price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      },
      [USER_ADMIN],
      "Authenticatin Required for CHANGE PRICE"
    );
  };

  onChangeQuantity = () => {
    if (!isEmpty(this.state.input)) {
      const quantity = parseFloat(this.state.input);

      if (quantity < 0) {
        /* message.error("Unable to return item(s)"); */

        /**
         * check quantity, if there is positive quantity, do not accept sales returns
         */

        if (
          this.state.items.length > 0 &&
          this.state.items.filter((o) => o.quantity > 0).length > 0
        ) {
          message.error(
            "Sales should be a separate transaction with Sales Return"
          );
          return;
        }

        this.returnForm.current.open((returns) => {
          this.userLoginForm.current.open(
            (user) => {
              const item_index = this.state.selected_item_index;
              let items = [...this.state.items];
              let item = items[item_index];

              const new_item = this.onAddItem({
                item: item.product,
                quantity,
                line_discount_rate: item.line_discount_rate,
                is_senior: item.is_senior,
              });

              items.splice(item_index, 1, {
                ...new_item,
                returns: {
                  ...returns,
                  user: this.props.auth.user,
                  supervisor: user,
                },
              });

              this.setState({
                items,
                input: "",
              });
              this.focusInput();
            },
            true,
            "Authentication Requred for SALES RETURNS"
          );
        });
      } else {
        if (
          this.state.items.length > 0 &&
          this.state.items.filter((o) => o.quantity < 0).length > 0
        ) {
          message.error(
            "Sales should be a separate transaction with Sales Return"
          );
          return;
        }

        const item_index = this.state.selected_item_index;
        let items = [...this.state.items];
        let item = items[item_index];

        const new_item = this.onAddItem({
          item: item.product,
          quantity,
          line_discount_rate: item.line_discount_rate,
          is_senior: item.is_senior,
          order: item.order,
          price: item.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
      }
    } else {
      message.error("Please enter a quantity");
    }
    this.focusInput();
  };

  onApplyLineDiscountRate = () => {
    if (this.state.items && this.state.items.length > 0) {
      /**
       * check if line has a discount, if discounted, remove discount
       */

      const item_index = this.state.selected_item_index;
      let items = [...this.state.items];
      let item = items[item_index];

      //remove discount
      if (item.line_discount_rate > 0) {
        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: 0,
          line_discount_value: 0,
          user: null,
          authorized_by: null,
          order: item.order,
          price: item.product.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      } else {
        if (isEmpty(this.state.input)) {
          message.error("Enter discount rate");
          this.focusInput();
          return;
        }

        let discount_rate = this.state.input;

        //check if discounted price is less than wholesale
        const wholesale_price = round(item.product?.wholesale_price);
        const discounted_price = round(item.price * (1 - discount_rate / 100));

        if (wholesale_price >= discounted_price) {
          message.error(
            "Unable to provide discount. Net Price should not be less than wholesale price"
          );

          this.userLoginForm.current.open(
            (user) => {
              const new_item = this.onAddItem({
                item: item.product,
                quantity: item.quantity,
                line_discount_rate: discount_rate,
                // user: this.props.auth.user,
                // authorized_by: user,
                order: item.order,
                price: item.price,
              });

              items.splice(item_index, 1, new_item);

              this.setState({
                items,
                input: "",
              });
              this.focusInput();
            },
            [USER_ADMIN],
            "Admin authentication required to override discount less than wholesale price"
          );
          return;
        }

        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: discount_rate,
          // user: this.props.auth.user,
          // authorized_by: user,
          order: item.order,
          price: item.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      }
    } else {
      message.error("Please select an item to apply discount");
    }
  };

  onApplyLineDiscountValue = () => {
    if (this.state.items && this.state.items.length > 0) {
      /**
       * check if line has a discount, if discounted, remove discount
       */

      const item_index = this.state.selected_item_index;
      let items = [...this.state.items];
      let item = items[item_index];

      //remove discount
      if (item.line_discount_value > 0) {
        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: 0,
          line_discount_value: 0,
          user: null,
          authorized_by: null,
          order: item.order,
          price: item.product.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      } else {
        if (isEmpty(this.state.input)) {
          message.error("Enter discount rate");
          this.focusInput();
          return;
        }

        let discount_value = this.state.input;

        //check if discounted price is less than wholesale
        const wholesale_price = round(item.product?.wholesale_price);
        const discounted_price = round(item.price - discount_value);

        if (wholesale_price >= discounted_price) {
          message.error(
            "Unable to provide discount. Net Price should not be less than wholesale price"
          );

          this.userLoginForm.current.open(
            (user) => {
              const new_item = this.onAddItem({
                item: item.product,
                quantity: item.quantity,
                //line_discount_rate: discount_rate,
                line_discount_value: discount_value,
                // user: this.props.auth.user,
                // authorized_by: user,
                order: item.order,
                price: item.price,
              });

              items.splice(item_index, 1, new_item);

              this.setState({
                items,
                input: "",
              });
              this.focusInput();
            },
            [USER_ADMIN],
            "Admin authentication required to override discount less than wholesale price"
          );

          return;
        }

        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          //line_discount_rate: discount_rate,
          line_discount_value: discount_value,
          // user: this.props.auth.user,
          // authorized_by: user,
          order: item.order,
          price: item.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      }
    } else {
      message.error("Please select an item to apply discount");
    }
  };

  onApplyLineSeniorDiscount = () => {
    if (this.state.items && this.state.items.length > 0) {
      /**
       * check if already applied senior, if applied, remove senior
       */

      let items = [...this.state.items];
      const item_index = this.state.selected_item_index;
      let item = items[item_index];

      if (item?.is_senior) {
        /**
         * remove senior discount
         */

        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: 0,
          is_senior: !item.is_senior,
          seniors: null,
          no_of_persons: null,
          order: item.order,
          price: item.product.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      } else {
        /* this.userLoginForm.current.open(
          (user) => { */
        this.seniorDiscountModal.current.open(({ seniors, no_of_persons }) => {
          if (seniors.length <= 0) {
            return;
          }

          const new_item = this.onAddItem({
            item: item.product,
            quantity: item.quantity,
            line_discount_rate: 0,
            is_senior: !item.is_senior,
            seniors,
            no_of_persons: parseInt(no_of_persons, 10),
            user: this.props.auth.user,
            authorized_by: null,
            order: item.order,
            price: item.price,
          });

          items.splice(item_index, 1, new_item);

          this.setState({
            items,
            input: "",
          });
          this.focusInput();
        });
        /* },
          true,
          "Authentication Required for LINE SENIOR/PWD DISCOUNT"
        ); */
      }
    } else {
      message.error("No items to be given discount");
    }
  };

  onApplyGlobalDiscount = () => {
    if (isEmpty(this.state.input)) {
      message.error("Enter discount rate");
      this.focusInput();
      return;
    } else if (this.state.items && this.state.items.length <= 0) {
      message.error("No items to be given discount");
      this.focusInput();
      return;
    }

    this.userLoginForm.current.open(
      (user) => {
        let discount_rate = isEmpty(this.state.input) ? 0 : this.state.input;

        let new_items = [];
        const items = [...this.state.items];

        items.forEach((item) => {
          const new_item = this.onAddItem({
            item: item.product,
            quantity: item.quantity,
            line_discount_rate: parseFloat(discount_rate),
            is_senior: false,
            user: this.props.auth.user,
            authorized_by: user,
            order: item.order,
            price: item.product.price,
          });

          new_items = [...new_items, new_item];
        });

        this.setState({
          input: "",
          discount_rate,
          items: new_items,
        });
        this.inputRef.current.focus();
      },
      true,
      "Authentication Required for GLOBAL MANUAL DISCOUNT"
    );
  };

  onApplyGlobalSeniorDiscount = () => {
    /**
     * check if there is senior discount, if there is remove all the senior discounts
     */

    const has_sc_disc = this.state.items.filter((o) => o.is_senior).length > 0;

    if (has_sc_disc) {
      let items = [];

      async.eachSeries(this.state.items, (item, cb) => {
        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: 0,
          is_senior: false,
          seniors: null,
          no_of_persons: null,
          order: item.order,
          price: item.gross_amount,
        });

        items = [...items, new_item];
        cb(null);
      });

      this.setState({
        items,
        is_senior: false,
      });

      return;
    }

    if (this.state.items && this.state.items.length > 0) {
      this.seniorDiscountModal.current.open(({ seniors, no_of_persons }) => {
        if (seniors.length <= 0) {
          return;
        }

        let new_items = [];
        const items = [...this.state.items];

        items.forEach((item) => {
          const new_item = this.onAddItem({
            item: item.product,
            quantity: item.quantity,
            line_discount_rate: 0,
            is_senior: true,
            seniors,
            no_of_persons: parseInt(no_of_persons, 10),
            user: this.props.auth.user,
            authorized_by: this.props.auth.user,
            order: item.order,
            price: item.price,
          });

          new_items = [...new_items, new_item];
        });

        this.setState({
          input: "",
          items: new_items,
          is_senior: !this.state.is_senior,
        });
        this.inputRef.current.focus();
      });

      /* this.userLoginForm.current.open(
        (user) => {
          this.seniorDiscountModal.current.open(
            ({ seniors, no_of_persons }) => {
              if (seniors.length <= 0) {
                return;
              }

              let new_items = [];
              const items = [...this.state.items];

              items.forEach((item) => {
                const new_item = this.onAddItem({
                  item: item.product,
                  quantity: item.quantity,
                  line_discount_rate: 0,
                  is_senior: true,
                  seniors,
                  no_of_persons: parseInt(no_of_persons, 10),
                  user: this.props.auth.user,
                  authorized_by: user,
                  order: item.order,
                  price: item.price,
                });

                new_items = [...new_items, new_item];
              });

              this.setState({
                input: "",
                items: new_items,
                is_senior: !this.state.is_senior,
              });
              this.inputRef.current.focus();
            }
          );
        },
        true,
        "Authentication Required for GLOBAL SENIOR/PWD DISCOUNT"
      ); */
    } else {
      message.error("No items to be given discount");
      this.focusInput();
    }
  };

  onRemoveDiscounts = () => {
    let new_items = [];
    const items = [...this.state.items];

    items.forEach((item) => {
      const new_item = this.onAddItem({
        item: item.product,
        quantity: item.quantity,
        line_discount_rate: 0,
        line_discount_value: 0,
        is_senior: false,
        order: item.order,
        price: item.product.price,
      });

      new_items = [...new_items, new_item];
    });

    this.setState({
      input: "",
      discount_rate: null,
      items: new_items,
    });
    this.inputRef.current.focus();
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
          `item-row-${this.state.selected_item_index}`
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
      value >
      this.state.items.length +
        this.state.payments.credit_cards.length +
        this.state.payments.checks.length +
        this.state.payments.online_payments.length +
        this.state.payments.free_of_charge_payments.length +
        this.state.payments.charge_to_accounts.length +
        this.state.payments.gift_checks.length -
        1
        ? this.state.items.length +
          this.state.payments.credit_cards.length +
          this.state.payments.online_payments.length +
          this.state.payments.checks.length +
          this.state.payments.free_of_charge_payments.length +
          this.state.payments.charge_to_accounts.length +
          this.state.payments.gift_checks.length -
          1
        : value;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `item-row-${this.state.selected_item_index}`
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

  focusOnLastRow = () => {
    let value =
      (this.state.items?.length || 0) +
      (this.state.payments?.credit_cards?.length || 0) +
      (this.state?.payments?.online_payments?.length || 0) +
      (this.state?.payments?.checks?.length || 0) +
      (this.state?.payments?.free_of_charge_payments?.length || 0) +
      (this.state?.payments?.charge_to_accounts?.length || 0) +
      (this.state.payments?.gift_checks?.length || 0) -
      1;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `item-row-${this.state.selected_item_index}`
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

  onAddCheck = () => {
    this.checkModalForm.current.open((check) => {
      const payments = {
        ...this.state.payments,
        checks: [...(this.state.payments?.checks || []), check],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      this.focusInput();

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("Cheque Added");
          })
          .catch((err) =>
            message.error("There was an error adding your cheque")
          );
      }
    });
  };

  onOnlinePayment = () => {
    this.onlinePaymentModalForm.current.open((payment) => {
      const payments = {
        ...this.state.payments,
        online_payments: [
          ...(this.state.payments?.online_payments || []),
          payment,
        ],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      this.focusInput();

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("Online Payment Added");
          })
          .catch((err) =>
            message.error("There was an error adding your Online Payment")
          );
      }
    });
  };

  onFreeOfChargePayment = () => {
    this.freeOfChargeModalForm.current.open((payment) => {
      const payments = {
        ...this.state.payments,
        free_of_charge_payments: [
          ...(this.state.payments?.free_of_charge_payments || []),
          { ...payment, user: this.props.auth.user },
        ],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      this.focusInput();

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("F.O.C Payment Added");
          })
          .catch((err) =>
            message.error("There was an error adding your checque")
          );
      }
    });
  };

  onChargeToAccount = () => {
    this.chargeToAccountModalForm.current.open((payment) => {
      const payments = {
        ...this.state.payments,
        charge_to_accounts: [
          ...(this.state.payments?.charge_to_accounts || []),
          { ...payment, user: this.props.auth.user },
        ],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      setTimeout(() => {
        this.focusInput();
      }, 300);

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("Charge to Account Added");
          })
          .catch((err) =>
            message.error("There was an error charging to account")
          );
      }
    });
  };

  onGiftCheckPayment = () => {
    this.giftCheckModalForm.current.open((payment) => {
      const payments = {
        ...this.state.payments,
        gift_checks: [
          ...(this.state.payments?.gift_checks || []),
          {
            gift_check: payment,
            amount: round(payment.items.amount),
          },
        ],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      this.focusInput();

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("Charge to Account Added");
          })
          .catch((err) =>
            message.error("There was an error charging to account")
          );
      }
    }, this.state.table);
  };

  onAddCreditCard = () => {
    this.creditCardForm.current.open((credit_card) => {
      const payments = {
        ...this.state.payments,
        credit_cards: [
          ...(this.state?.payments?.credit_cards || []),
          {
            credit_card,
          },
        ],
      };

      this.setState(
        {
          payments,
        },
        () => {
          this.focusOnLastRow();
        }
      );
      this.focusInput();

      if (this.state.table?._id) {
        const form_data = {
          _id: this.state.table._id,
          payments,
        };
        axios
          .post(`/api/tables/${this.state.table._id}/update`, {
            table: form_data,
          })
          .then((response) => {
            message.success("Credit Card Added");
          })
          .catch((err) =>
            message.error("There was an error adding your credit card")
          );
      }
    });
  };

  onAddItem = ({
    item,
    quantity = 1,
    line_discount_rate = 0,
    line_discount_value = 0,
    is_senior = 0,
    seniors = null,
    no_of_persons = null,
    user = null,
    authorized_by = null,
    order = null,
    price = null,
  }) => {
    return getBreakdown({
      item,
      quantity,
      line_discount_rate,
      line_discount_value,
      is_senior,
      seniors,
      no_of_persons,
      user,
      authorized_by,
      order,
      price,
    });
  };

  onPressEnter = (e) => {
    e.preventDefault();
    /* e.stopPropogation(); */

    let input = this.state.input;
    const split = input.split("*");

    let sku = "";
    let quantity = 1;

    if (split.length > 1) {
      quantity = split[0];
      sku = split[1];
    } else {
      sku = split[0];
    }

    const form_data = {
      sku: sku.trim(),
    };

    if (isEmpty(sku.trim())) return message.error("Empty SKU supplied");

    const loading = message.loading("Loading...");
    axios
      .post("/api/products/sku", form_data)
      .then(async ({ data }) => {
        loading();
        if (data) {
          if (quantity < 0) {
            /* message.error("Unable to return item(s)"); */
            if (
              this.state.items.length > 0 &&
              this.state.items.filter((o) => o.quantity > 0).length > 0
            ) {
              message.error(
                "Sales should be a separate transaction with Sales Return"
              );
              return;
            }

            this.returnForm.current.open((returns) => {
              const item = this.onAddItem({
                item: { ...data, price: data.price },
                quantity: parseFloat(quantity),
                price: data.price,
              });

              this.setState({
                input: "",
                items: [
                  ...this.state.items,
                  {
                    ...item,
                    returns,
                  },
                ],
                amount_due_label: "AMOUNT DUE",
                change: null,
              });
              this.inputRef.current.focus();
            });
            this.focusInput();
          } else {
            let { price } = await getCustomerPrice({
              product: data,
              customer: this.state.customer?.customer,
            });

            const item = this.onAddItem({
              item: { ...data, price },
              quantity,
              price,
            });

            this.setState({
              input: "",
              items: [...this.state.items, item],
              amount_due_label: "AMOUNT DUE",
              change: null,
            });
            this.inputRef.current.focus();
            this.focusOnLastRow();
          }
        } else {
          message.error("Product SKU not found.", 0.5);
          this.setState({
            input: "",
            amount_due_label: "AMOUNT DUE",
            change: null,
          });
          this.focusInput();
        }
      })
      .catch((err) => {
        loading();
        message.error("There was an error processing your request");
      });
  };

  onSearchProductSelect = async ({ item }) => {
    let quantity = validator.isNumeric(this.state.input)
      ? parseFloat(this.state.input)
      : 1;

    if (quantity < 0) {
      /**
       * display return form
       */

      this.returnForm.current.open(async (returns) => {
        const { price } = await getCustomerPrice({
          product: item,
          customer: this.state.customer?.customer,
        });

        const new_item = this.onAddItem({
          item: {
            ...item,
            price,
          },
          quantity,
          price,
        });

        let items = [
          ...this.state.items,
          {
            ...new_item,
            returns: {
              ...returns,
            },
          },
        ];

        const selected_item_index = items.length - 1;

        this.setState({
          items,
          input: "",
          selected_item_index,
        });
        this.focusInput();
      });

      return;
    }

    const { price } = await getCustomerPrice({
      product: item,
      customer: this.state.customer?.customer,
    });

    const new_item = this.onAddItem({
      item: {
        ...item,
        price,
      },
      quantity,
      price,
    });
    let items = [...this.state.items, new_item];
    const selected_item_index = items.length - 1;

    this.setState({
      input: "",
      items,
      amount_due_label: "AMOUNT DUE",
      change: null,
      selected_item_index,
    });
    this.inputRef.current.focus();
    this.focusOnLastRow();
  };

  onSuspendSaleSelect = ({ sale }) => {
    const record = { ...sale };
    const id = record._id;
    /** delete suspended transactions */

    delete record._id;
    this.setState(
      (prevState) => {
        return {
          ...default_form_data,
          ...record,
          suspended_sale: sale,
          items: [...prevState.items, ...record.items],
        };
      },
      () => {
        axios.delete(`/api/sales/${id}/suspended-sale`);
        this.focusInput();
      }
    );
  };

  onSearchTableSelect = ({ table }) => {
    let items = [];
    (table.orders || []).forEach((order) => {
      (order.items || []).forEach((item) => {
        const seniors = ((table.summary && table.summary.seniors) || []).map(
          (senior) => {
            return {
              no: senior.senior_number,
              name: senior.senior_name,
            };
          }
        );
        const is_senior = (table.summary && table.summary.is_sc) || 0;
        const no_of_persons =
          (table.summary && table.summary.number_of_persons) || 0;
        const user = table.summary ? table.summary.user : null;
        const authorized_by = table.summary
          ? table.summary.authorized_by
          : null;

        const line_discount_rate = table?.summary?.discount_rate * 100 || 0;

        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          order: {
            table: {
              _id: table._id,
              name: table.name,
            },
            order_id: order.order_id,
            datetime: order.datetime,
          },
          is_senior,
          ...(is_senior && {
            seniors,
            no_of_persons: parseInt(no_of_persons, 10),
            user,
            authorized_by,
          }),
          line_discount_rate,
          ...(line_discount_rate > 0 && {
            user,
            authorized_by,
          }),
          price: item.price,
        });

        items = [...items, new_item];
      });
    });

    this.setState({
      items,
      table,
      amount_due_label: "AMOUNT DUE",
      change: null,
      payments: table.payments,
      customer: {
        ...table.customer,
        customer_name: table?.customer?.name,
      },
    });
    this.inputRef.current.focus();
  };

  onReprint = () => {
    const input = this.state.input;

    if (isEmpty(input) || input.toLowerCase() === "b") {
      /**
       * reprint latest
       */

      const loading = message.loading("Processing...");
      axios
        .post("/api/sales/reprint/latest", {
          input,
        })
        .then(() => {
          loading();
          message.success("Sale reprinted");
          this.setState({
            input: "",
          });
          this.focusInput();
        })
        .catch((err) => {
          message.error("There was an error processing your request.");
          this.setState({
            input: "",
          });
          this.focusInput();
        });
    } else {
      /**
       * reprint given sales invoice
       */

      this.userLoginForm.current.open(
        (user) => {
          const loading = message.loading("Processing...");
          axios
            .post(`/api/sales/reprint/${input}`)
            .then(() => {
              loading();
              message.success("Sale reference reprinted");
              this.setState({
                input: "",
              });
              this.focusInput();
            })
            .catch((err) => {
              message.error("Sale reference not found");
              this.setState({
                input: "",
              });
              this.focusInput();
            });
        },
        true,
        "Authentication Required for SI/OR Reprint"
      );
    }
  };

  onXread = () => {
    const input = this.state.input;

    this.userLoginForm.current.open(
      (user) => {
        if (isEmpty(input)) {
          const form_data = {
            user: this.props.auth.user,
          };
          const loading = message.loading("Processing...");
          axios
            .post("/api/sales/xread", form_data)
            .then(() => {
              loading();
              message.success("Xread printed");
              this.focusInput();
            })
            .catch((err) => {
              loading();
              if (err.response.data && err.response.data.msg) {
                message.error(err.response.data.msg);
              } else {
                message.error("There was an error processing your request.");
              }

              this.focusInput();
            });
        } else {
          /**
           * reprint xread reference
           */

          const form_data = {
            user: this.props.auth.user,
            xread_id: input,
          };
          const loading = message.loading("Processing...");
          axios
            .post("/api/sales/xread-reprint", form_data)
            .then(() => {
              loading();
              message.success("Xread printed");
              this.setState({ input: "" });
              this.focusInput();
            })
            .catch((err) => {
              loading();
              message.error("Xread reference not found");
              this.focusInput();
            });
        }
      },
      false,
      "Authentication Required for XREAD"
    );
  };

  onZread = () => {
    const input = this.state.input;

    this.userLoginForm.current.open(
      async (user) => {
        if (isEmpty(input)) {
          const has_zread = await this.hasZread();
          if (has_zread) {
            message.error("Unable to Zread. Zread already processed.");
            return;
          }

          const form_data = {
            user: this.props.auth.user,
          };
          const loading = message.loading("Processing...");
          axios
            .post("/api/sales/zread", form_data)
            .then(() => {
              loading();
              message.success("Zread printed");
              this.focusInput();
            })
            .catch((err) => {
              loading();
              message.error("There was an error processing your request.");
              this.focusInput();
            });
        } else {
          /**
           * reprint zread reference
           */

          const form_data = {
            user: this.props.auth.user,
            zread_id: input,
          };
          const loading = message.loading("Processing...");
          axios
            .post("/api/sales/zread-reprint", form_data)
            .then(() => {
              loading();
              message.success("Zread printed");
              this.focusInput();
            })
            .catch((err) => {
              loading();
              message.error("Zread reference not found");
              this.focusInput();
            });
        }
      },
      false,
      "Authentication Required for ZREAD"
    );
  };

  onVoidSale = () => {
    let sales_id = this.state.input;

    if (isEmpty(sales_id)) {
      message.error("Please enter SI/OR # to void");
      this.focusInput();
      return;
    }

    this.voidSaleReasonModal.current.open((reason) => {
      this.userLoginForm.current.open(
        (user) => {
          const form_data = {
            user: this.props.auth.user,
            authorized_by: user,
            reason,
          };

          axios
            .delete(`/api/sales/${sales_id}/sales-id`, {
              data: {
                ...form_data,
              },
            })
            .then((response) => {
              message.success("Sale Voided");
              this.setState({ input: "" });
              this.focusInput();
            })
            .catch((err) => {
              message.error(err.response.data.msg);
              this.focusInput();
            });
        },
        true,
        "Authentication Required for VOIDING SALE"
      );
    });
  };

  hasZread = () => {
    return new Promise((resolve, reject) => {
      axios
        .post("/api/sales/has-zread", {})
        .then((response) => {
          resolve(response.data.status);
        })
        .catch((err) => reject(err));
    });
  };

  onRowSelected = (index) => {
    this.setState(
      {
        selected_item_index: index,
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
        this.focusInput();
      }
    );
  };

  onCashCount = () => {
    this.cashCountModalForm.current.open(() => {
      message.success("Cash Count Saved");
    }, this.props.auth.user);
  };

  render() {
    const records_column = [
      {
        title: "ITEM",
        dataIndex: "item_display",
      },
      {
        title: "QTY",
        dataIndex: "quantity",
        align: "right",
        width: 150,
      },
      {
        title: "PRICE",
        dataIndex: "per_unit_price",
        align: "right",
        render: (value) => <span>{value && numberFormat(value)}</span>,
        width: 150,
      },
      {
        title: "AMOUNT",
        dataIndex: "net_amount",
        align: "right",
        render: (value) => <span>{value && numberFormat(value)}</span>,
        width: 150,
      },
      /* {
        title: "REMARKS",
        dataIndex: "remarks",
        align: "center",
        width: 150,
      }, */
    ];

    const items = addKeysToArray(this.state.items || []);

    return (
      <div className="is-flex container-is-fullheight">
        <KeyboardEventHandler
          handleKeys={["esc"]}
          onKeyEvent={(key, e) => this.focusInput()}
        />
        <CustomerInfoModal
          ref={this.customerInfoModal}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <CreditCardForm
          ref={this.creditCardForm}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <CheckModalForm
          ref={this.checkModalForm}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <CashCountForm
          ref={this.cashCountModalForm}
          onCancel={() => {
            this.focusInput();
          }}
        />

        <GiftCheckForm ref={this.giftCheckModalForm} />

        <OnlinePaymentModalForm
          ref={this.onlinePaymentModalForm}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <FreeOfChargePaymentModalForm
          ref={this.freeOfChargeModalForm}
          onCancel={() => {
            this.focusInput();
          }}
        />

        <ChargeToAccountModalForm
          ref={this.chargeToAccountModalForm}
          onCancel={() => {
            this.focusInput();
          }}
        />

        <ReturnForm ref={this.returnForm} />
        <SeniorDiscountModal
          placeholder="Senior No. / Name / Tin"
          ref={this.seniorDiscountModal}
          onCancel={() => {
            this.focusInput();
          }}
        />
        <SelectOrderModal
          ref={this.selectOrderModal}
          onSelectOrder={(order) => {
            if (order) {
              this.setState({
                customer: order.customer,
              });

              let items = [...this.state.items];
              order.items.forEach((item) => {
                const new_item = this.onAddItem({
                  item: item.product,
                  quantity: item.quantity,
                  line_discount_rate: isEmpty(item.discount_rate)
                    ? 0
                    : parseFloat(item.discount_rate),
                  line_discount_value: isEmpty(item.discount_value)
                    ? 0
                    : parseFloat(item.discount_value),
                  price: item.price,
                });
                console.log(new_item);
                items = [...items, new_item];
              });
              this.setState({
                items,
                input: "",
                amount_due_label: "AMOUNT DUE",
                change: null,
                sales_order_id: order._id,
              });
            }

            this.focusInput();
          }}
        />

        <InputModal
          title="Void Sale Reason"
          placeholder="Reason"
          ref={this.voidSaleReasonModal}
        />

        <SearchProductModal
          onSearchProductSelect={this.onSearchProductSelect}
          ref={this.searchProductModal}
          onCancel={() => this.focusInput()}
        />

        <SearchTableModal
          onSelect={this.onSuspendSaleSelect}
          onSearchTableSelect={this.onSearchTableSelect}
          ref={this.searchTableModal}
          onCancel={() => {
            this.focusInput();
          }}
        />

        <SearchSuspendedSalesModal
          onSelect={this.onSuspendSaleSelect}
          ref={this.searchSuspendedSalesModal}
          onCancel={() => {
            this.focusInput();
          }}
        />

        <InputModal
          title="GC Reference"
          placeholder="GC Reference"
          ref={this.gcReferenceModal}
          onCancel={() => this.focusInput()}
        />

        <InputModal
          title="Discount Rate"
          placeholder="%"
          ref={this.discountRateModal}
          onCancel={() => this.focusInput()}
        />

        <UserLoginForm
          ref={this.userLoginForm}
          focusInput={this.focusInput}
          supervisor_authentication={true}
          onCancel={() => this.focusInput()}
        />
        <ProductOrderForm
          ref={this.productOrderForm}
          product={this.state.product}
        />
        <div style={{ flex: 5 }}>
          <div className="is-flex is-full-height flex-column">
            <div
              style={{ flex: 6, padding: "16px" }}
              className="is-flex flex-column"
            >
              <div className="m-b-1">
                <Input
                  ref={this.inputRef}
                  name="input"
                  value={this.state.input}
                  onChange={this.onChange}
                  onKeyDown={this.onKeyDown}
                  autoFocus={true}
                  onPressEnter={this.onPressEnter}
                  autoComplete="off"
                />
              </div>

              <div
                className="flex-1"
                style={{ backgroundColor: "#fff", overflow: "aut" }}
              >
                <Table
                  ref={(input) => (this.tableRef = input)}
                  dataSource={[
                    ...addKeysToArray([
                      ...items.map((item) => {
                        return {
                          ...item,
                          type: ITEM,
                          item_display: (
                            <div>
                              {item.product.name} <br />
                              {item.returns &&
                                `SI#${item.returns.sales_id} / ${item.returns.remarks}`}
                            </div>
                          ),
                          remarks: (
                            <span>
                              {item.is_senior ? "SC" : ""}
                              {item.line_discount_rate
                                ? `${item.line_discount_rate} %`
                                : ""}
                            </span>
                          ),
                        };
                      }),
                      ...(this.state?.payments?.credit_cards || []).map(
                        (item) => {
                          return {
                            ...item,
                            item_display: (
                              <div>
                                {item.credit_card?.name} <br />
                                {item.credit_card?.card} /{" "}
                                {item.credit_card?.bank}
                              </div>
                            ),
                            net_amount: `(${numberFormat(
                              item?.credit_card?.amount
                            )})`,
                          };
                        }
                      ),
                      ...(this.state?.payments?.checks || []).map((item) => {
                        return {
                          ...item,
                          item_display: (
                            <div>
                              <div>{item.bank}</div>
                              <div>{item.name}</div>
                              <div>{item.check_no}</div>
                              <div>
                                {moment(item.check_date).format("MM/DD/YYYY")}
                              </div>
                            </div>
                          ),
                          net_amount: `(${numberFormat(item.amount)})`,
                        };
                      }),
                      ...(this.state.payments?.online_payments || []).map(
                        (item) => {
                          return {
                            ...item,
                            item_display: (
                              <div>
                                <div>
                                  {item.depository}/{item.reference}
                                </div>
                              </div>
                            ),
                            net_amount: `(${numberFormat(item.amount)})`,
                          };
                        }
                      ),
                      ...(
                        this.state.payments?.free_of_charge_payments || []
                      ).map((item) => {
                        return {
                          ...item,
                          item_display: (
                            <div>
                              <div>
                                F.O.C : {item.name}/{item.remarks}
                              </div>
                            </div>
                          ),
                          net_amount: `(${numberFormat(item.amount)})`,
                        };
                      }),
                      ...(this.state.payments?.charge_to_accounts || []).map(
                        (item) => {
                          return {
                            ...item,
                            item_display: (
                              <div>
                                <div>Charge : {item.account?.name}</div>
                              </div>
                            ),
                            net_amount: `(${numberFormat(item.amount)})`,
                          };
                        }
                      ),
                      ...(this.state.payments?.gift_checks || []).map(
                        (item) => {
                          return {
                            ...item,
                            item_display: (
                              <div>
                                <div>
                                  GC :{" "}
                                  {item.gift_check?.items?.gift_check_number}
                                </div>
                              </div>
                            ),
                            net_amount: `(${numberFormat(item.amount)})`,
                          };
                        }
                      ),
                    ]),
                  ]}
                  columns={records_column}
                  scroll={{ y: 500 }}
                  pagination={false}
                  rowClassName={(record, index) => {
                    if (this.state.selected_item_index === index) {
                      return `is-item-selected item-row-${index}`;
                    }
                    return `item-row-${index}`;
                  }}
                  onRow={(record, rowIndex) => {
                    return {
                      onClick: (event) => {
                        this.onRowSelected(rowIndex);
                      },
                    };
                  }}
                />
              </div>
            </div>
            <div
              className="is-flex"
              style={{ flex: 2, padding: "0px 16px 16px 16px" }}
            >
              <div
                style={{ flex: 2, backgroundColor: "#fff", padding: "16px" }}
              >
                <Row>
                  <Col span={10}>CASHIER</Col>
                  <Col span={14} className="has-text-right">
                    {this.props.auth?.user?.name}
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>SALES LADY</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.seller?.name || ""}
                  </Col>
                </Row>
                {!isEmpty(this.state.table?.tieup_information?.tieup?.name) && (
                  <Row>
                    <Col span={10}>TIE-UP</Col>
                    <Col span={14} className="has-text-right">
                      {this.state.table?.tieup_information?.tieup?.name}
                    </Col>
                  </Row>
                )}
                {!isEmpty(
                  this.state.table?.tieup_information?.booking_reference
                ) && (
                  <Row>
                    <Col span={10}>BOOKING REF.</Col>
                    <Col span={14} className="has-text-right">
                      {this.state.table?.tieup_information?.booking_reference}
                    </Col>
                  </Row>
                )}
                <Row>
                  <Col span={10}>CUSTOMER</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.customer.customer_name}
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>ADDRESS</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.customer.address}
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>TIN</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.customer.tin}
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>BUS. STYLE</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.customer.business_style}
                  </Col>
                </Row>
                <Row>
                  <Col span={10}>OSACA/PWD NO</Col>
                  <Col span={14} className="has-text-right">
                    {this.state.customer.osaca_pwd_no}
                  </Col>
                </Row>
              </div>
              <div
                className="is-flex flex-column"
                style={{ flex: 5, backgroundColor: "#fff", padding: "16px" }}
              >
                <Row gutter={32}>
                  <Col span={12}>
                    <Row>
                      <Col span={14}>NO. OF ITEMS</Col>
                      <Col span={10} className="has-text-right">
                        {this.state.summary.no_of_items}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>SUBTOTAL</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.net_of_returns)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>LESS RETURNS</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.total_returns)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>LESS SC/PWD VAT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.less_vat)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>LESS SC/PWD DISC</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.less_sc_disc)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>DISCOUNT AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.discount_amount)}
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <Row>
                      <Col span={14}>VATABLE AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.vatable_amount)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>VAT AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.vat_amount)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>VAT EXEMPT AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.vat_exempt_amount)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>NON VATABLE AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.non_vatable_amount)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={14}>ZERO-RATED AMOUNT</Col>
                      <Col span={10} className="has-text-right">
                        {numberFormat(this.state.summary.zero_rated)}
                      </Col>
                    </Row>
                    {/* <Row>
                      <Col span={14}>PAYMENTS</Col>
                      <Col span={10} className="has-text-right">
                        0.00
                      </Col>
                    </Row> */}
                  </Col>
                </Row>
                <div className="flex-1 is-flex">
                  <div className="is-flex" style={{ alignItems: "flex-end" }}>
                    {this.state.amount_due_label}
                  </div>
                  <div
                    className="flex-1 has-text-right is-flex"
                    style={{ alignItems: "flex-end" }}
                  >
                    <div className="has-text-right flex-1 amount-due">
                      {numberFormat(
                        this.state.change
                          ? this.state.change
                          : this.state.summary.amount_due
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="is-flex flex-column"
          style={{ flex: 1, padding: "16px" }}
        >
          {this.props.auth?.user?.permissions?.length > 0 && (
            <div
              className="cashier-buttons"
              onClick={() => this.props.navigate("/update-password")}
            >
              <div className="has-text-centered">Admin Panel</div>
            </div>
          )}

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.props.logoutUser();
                this.props.navigate("/");
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F1</span> <br />
                Logout
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onReprint();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F2</span> <br />
                Reprint
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onSearchItem();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F3</span> <br />
                Search Item
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onDeleteItem();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F4</span> <br />
                Delete Item
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onVoidSale();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F4</span> <br />
                Void Sale
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onChangePrice();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F9</span> <br />
                Change Price
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                if (!isEmpty(this.state.table)) {
                  message.error("Unable to change quantity");
                  return;
                }
                this.onChangeQuantity();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F6</span> <br />
                Change Quantity
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            {/*             <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onApplyLineDiscountRate();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F7</span> <br />
                Disc Rate
              </div>
            </div> */}
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onApplyLineDiscountRate();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F8</span> <br />
                Disc Value
              </div>
            </div>
            {/* <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onApplyLineSeniorDiscount();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F7</span> <br />
                Senior / PWD Disc
              </div>
            </div> */}
          </div>

          {/* <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onApplyGlobalDiscount();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F8</span> <br />
                Apply Global Discount
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onApplyGlobalSeniorDiscount();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F8</span> <br />
                Global Senior / PWD Disc
              </div>
            </div>
          </div> */}

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onChangePrice();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F9 </span> <br />
                Change Price
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onSetCustomerInfo();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">Ctrl Shift F9 </span>{" "}
                <br />
                Set Customer
              </div>
            </div>
            {/* <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onAddCreditCard();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F9</span> <br />
                Add Credit/Debit Card
              </div>
            </div> */}
          </div>
          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onRemoveDiscounts();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">Ctrl + Shift + V</span>{" "}
                <br />
                Remove Discounts
              </div>
            </div>
          </div>

          {/* <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.props.navigate("/stocks-receiving-staff");
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> </span> <br />
                Receive Items
              </div>
            </div>
          </div> */}

          <div className="is-flex flex-row">
            {/* <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.props.navigate("/account-collections");
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"></span> <br />
                Collections
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onAddCheck();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"></span> <br />
                Cheque
              </div>
            </div> */}
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onSuspendSale();
                // this.onPrintBill();
                // this.onFreeOfChargePayment();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> Ctrl + Shft + D</span>{" "}
                <br />
                Suspend Sale
                {/* F.O.C */}
              </div>
            </div>
          </div>

          {/* <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onChargeToAccount();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"></span>
                Charge to Account
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onGiftCheckPayment();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> </span>
                G.C.
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onOnlinePayment();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> </span>
                Online Payment
              </div>
            </div>
          </div> */}

          <div
            className="cashier-buttons"
            onClick={() => {
              this.onSearchSuspendedSale();
            }}
          >
            <div className="has-text-centered">
              <span className="has-text-weight-bold">F7</span> <br />
              Search Suspend Sale
            </div>
          </div>

          {/* <div
            className="cashier-buttons"
            onClick={() => {
              this.selectOrderModal.current.open();
            }}
          >
            <div className="has-text-centered">
              <span className="has-text-weight-bold">Ctrl + Shift + O</span>{" "}
              <br />
              Search Orders
            </div>
          </div> */}

          <div
            className="cashier-buttons "
            onClick={() => {
              this.onDailySalesInventoryReport();
            }}
          >
            <div className="has-text-centered">
              <span className="has-text-weight-bold">Ctrl + Shift + I </span>{" "}
              <br />
              Print Sales Out
            </div>
          </div>

          <div
            className="cashier-buttons"
            onClick={() => {
              this.onFinish();
            }}
          >
            <div className="has-text-centered">
              <span className="has-text-weight-bold">F10</span> <br />
              Finish
            </div>
          </div>
          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onCashCount();
              }}
            >
              <div className="has-text-centered">Cash Count</div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onXread();
              }}
            >
              <div className="has-text-centered">XREAD</div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onZread();
              }}
            >
              <div className="has-text-centered">ZREAD</div>
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
  logoutUser,
  reset,
})(withParams(CashierForm));
