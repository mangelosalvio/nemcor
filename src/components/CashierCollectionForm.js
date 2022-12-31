import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
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
import { USER_ADMIN, USER_OWNER } from "../utils/constants";
import { logoutUser } from "./../actions/authActions";
import { reset } from "./../actions/posActions";
import CreditCardForm from "./CreditCardForm";
import ReturnForm from "./ReturnForm";
import SearchTableModal from "./SearchTableModal";
import SeniorDiscountModal from "./SeniorDiscountModal";
import { getBreakdown, getCollectionsSummary } from "./../utils/computations";
import { getProductTieupPrice } from "../utils/functions";
import CheckModalForm from "./CheckModalForm";
import { addKeysToArray } from "./utils/utilities";
import moment from "moment";
import OnlinePaymentModalForm from "./OnlinePaymentModalForm";
import FreeOfChargePaymentModalForm from "./FreeOfChargePaymentModalForm";
import ChargeToAccountModalForm from "./ChargeToAccountModalForm";
import GiftCheckForm from "./GiftCheckForm";
import AccountModalForm from "./AccountModalForm";
import { parse } from "dotenv";

let processing = false;
const default_form_data = {
  input: "",
  account: null,
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
    checks_total: 0,
  },
  items: [],
  selected_item_index: 0,
  customer: {},
  summary: {
    subtotal: 0,
    no_of_items: 0,
    net_amount: 0,
  },
  amount_due_label: "AMOUNT DUE",
  change: null,
  is_other_set: false,
};

class CashierCollectionForm extends Component {
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
    this.freeOfChargeModalForm = React.createRef();
    this.chargeToAccountModalForm = React.createRef();
    this.accountModalForm = React.createRef();
    this.giftCheckModalForm = React.createRef();
    this.returnForm = React.createRef();
    this.voidSaleReasonModal = React.createRef();
  }

  componentDidMount() {
    if (!this.props.auth.isAuthenticated) {
      this.props.history.push("/");
    }

    /**
     * BILLING TO CASHIER
     */
    const table_id = this.props.match.params.table_id;

    if (table_id) {
      const loading = message.loading("Loading...");
      axios
        .get(`/api/tables/${table_id}`)
        .then((response) => {
          loading();
          const table = { ...response.data };
          this.onSearchTableSelect({ table });
          this.focusInput();
        })
        .catch((err) => {
          console.log(err);
          loading();
          message.error("There was a problem processing your request");
        });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.items !== this.state.items ||
      prevState.discount_rate !== this.state.discount_rate ||
      prevState.is_senior !== this.state.is_senior ||
      prevState.payments.credit_cards !== this.state.payments.credit_cards ||
      prevState.payments.checks !== this.state.payments.checks ||
      prevState.payments.online_payments !==
        this.state.payments.online_payments ||
      prevState.payments.free_of_charge_payments !==
        this.state.payments.free_of_charge_payments ||
      prevState.payments.charge_to_accounts !==
        this.state.payments.charge_to_accounts ||
      prevState.payments.gift_checks !== this.state.payments.gift_checks
    ) {
      const {
        subtotal,
        no_of_items,
        net_amount,
        credit_card_total,
        online_payments_total,
        checks_total,
        free_of_charge_payments_total,
        charge_to_accounts_total,
        gift_checks_total,
        amount_due,
      } = getCollectionsSummary({
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
          net_amount,
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
    this.props.history.push("/cashier-tables");
  };

  focusInput = () => {
    if (this.inputRef.current) {
      this.inputRef.current.focus();
    }
  };

  onKeyDown = (e) => {
    /* console.log(e.shiftKey);
    console.log(e.key); */

    /*e.stopPropogation();*/
    if (e.key === "ArrowUp") {
      this.onArrowUp();
    } else if (e.key === "ArrowDown") {
      this.onArrowDown();
    } else if (e.key === "F1") {
      this.props.logoutUser();
      this.props.history.push("/");
    } else if (e.key === "F2") {
      this.onReprint();
    } else if (e.shiftKey && e.key === "F3") {
      e.preventDefault();
      this.onSearchTable();
    } else if (e.key === "F3") {
      e.preventDefault();
      this.onSearchItem();
    } else if (e.shiftKey && e.key === "F4") {
      this.onVoidCollection();
    } else if (e.key === "F4") {
      /* if (!isEmpty(this.state.table)) {
        message.error("Unable to delete item");
        return;
      } */
      this.onDeleteItem();
    } else if (e.key === "F5") {
      this.onChangePrice();
    } else if (e.key === "F6") {
      if (!isEmpty(this.state.table)) {
        message.error("Unable to change quantity");
        return;
      }
      this.onChangeQuantity();
    } else if (e.shiftKey && e.key === "F7") {
      this.onApplyLineSeniorDiscount();
    } else if (e.key === "F7") {
      this.onApplyLineDiscount();
    } else if (e.shiftKey && e.key === "F8") {
      this.onApplyGlobalSeniorDiscount();
    } else if (e.key === "F8") {
      this.onApplyGlobalDiscount();
    } else if (e.shiftKey && e.key === "F9") {
      this.onAddCreditCard();
    } else if (e.key === "F9") {
      this.onSelectAccount();
    } else if (e.key === "F10") {
      e.preventDefault();
      this.onFinish({
        is_deposit: true,
      });
    } else if (e.shiftKey && e.key === "F11") {
      /* this.onZread(); */
    } else if (e.key === "F11") {
      /* this.onXread(); */
    }
  };

  onFinish = async (
    { is_deposit = false, is_debit_to_account = false } = {
      is_deposit: false,
      is_debit_to_account: false,
    }
  ) => {
    let cash = this.state.summary.amount_due;

    let payment_amount = isEmpty(this.state.input)
      ? this.state.summary.amount_due
      : parseFloat(this.state.input);

    if (this.state.items.length <= 0 && !is_deposit) {
      message.error("No items to process");
      return;
    }

    if (
      (this.state.summary.amount_due == 0 ||
        isEmpty(this.state.summary.amount_due)) &&
      isEmpty(payment_amount)
    ) {
      message.error("No Transaction Found");
      return;
    }

    if (
      is_deposit &&
      this.state.items.filter((o) => o.payment_amount > 0).length > 0
    ) {
      message.error("Unable to Deposit. Clear all Payment Items");
      return;
    }

    if (isEmpty(this.state.account)) {
      message.error("Account is required");
      return;
    }

    let deposit_payment_total = 0;

    if (this.state.summary.amount_due > payment_amount) {
      message.error("Invalid amount");
      return;
    }

    if (is_debit_to_account) {
      deposit_payment_total = round(this.state.summary.amount_due);

      /**
       * check if deposit payment is less than or equal to remaining balance
       */
    }

    const has_zread = await this.hasZread();

    if (has_zread) {
      message.error(
        "Unable to make new process sale. Zread already processed."
      );
      return;
    }

    let change = round(payment_amount - this.state.summary.amount_due);

    let deposit_total = 0;

    if (is_deposit) {
      if (this.state.summary.amount_due < 0 && payment_amount < 0) {
        deposit_total = Math.abs(round(this.state.summary.amount_due));
      } else if (this.state.summary.amount_due < 0 && payment_amount > 0) {
        deposit_total = round(
          Math.abs(this.state.summary.amount_due) + payment_amount
        );
      } else if (payment_amount > 0) {
        deposit_total = payment_amount;
      }

      cash = round(deposit_total + (this.state.summary.amount_due || 0));
      change = 0;
    }

    const form_data = {
      account: this.state.account,
      items: this.state.items,
      summary: {
        ...this.state.summary,
        payment_amount,
        change,
      },
      payments: {
        ...this.state.payments,
        cash,
        deposit_total,
        deposit_payment_total,
      },
      customer: this.state.customer,
      user: this.props.auth.user,
      is_other_set: this.state.is_other_set,
    };

    const loading = message.loading("Processing...");

    if (processing) {
      message.error("Please wait for a moment to finish sale.");
    }

    processing = true;
    axios
      .put("/api/account-collections", form_data)
      .then((response) => {
        processing = false;
        loading();

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

  onDeleteItem = () => {
    let payments = {
      ...this.state.payments,
    };
    console.log(this.state.selected_item_index);
    if (this.state.selected_item_index < this.state.items.length) {
      let items = [...this.state.items];
      const item = items[this.state.selected_item_index];
      let selected_item_index = this.state.selected_item_index;

      if (!isEmpty(item.order)) {
        message.error(
          "Unable to delete order. Please cancel in the ordering module"
        );
      } else {
        items.splice(this.state.selected_item_index, 1);

        if (selected_item_index > items.length - 1) {
          selected_item_index = items.length - 1;
        }

        message.success("Successfully deleted order");
      }

      this.setState({
        items,
        selected_item_index,
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
  };

  onChangePrice = () => {
    if (isEmpty(this.state.input)) {
      message.error("Please enter price");
      this.focusInput();
      return;
    }

    this.userLoginForm.current.open((user) => {
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
      this.focusInput();
    }, true);
  };

  onChangeQuantity = () => {
    if (!isEmpty(this.state.input)) {
      const quantity = parseFloat(this.state.input);

      if (quantity < 0) {
        message.error("Unable to return item(s)");
        /* this.returnForm.current.open(returns => {
          const item_index = this.state.selected_item_index;
          let items = [...this.state.items];
          let item = items[item_index];

          const new_item = this.onAddItem({
            item: item.product,
            quantity,
            line_discount_rate: item.line_discount_rate,
            is_senior: item.is_senior
          });

          items.splice(item_index, 1, {
            ...new_item,
            returns
          });

          this.setState({
            items,
            input: ""
          });
          this.focusInput();
        }); */
      } else {
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

  onApplyLineDiscount = () => {
    if (isEmpty(this.state.input)) {
      message.error("Enter discount rate");
      this.focusInput();
      return;
    }

    if (this.state.items && this.state.items.length > 0) {
      /**
       * check if line has a discount, if discounted, remove discount
       */

      const item_index = this.state.selected_item_index;
      let items = [...this.state.items];
      let item = items[item_index];

      if (item.line_discount_rate > 0) {
        const new_item = this.onAddItem({
          item: item.product,
          quantity: item.quantity,
          line_discount_rate: 0,
          user: null,
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
      } else {
        this.userLoginForm.current.open((user) => {
          let discount_rate = isEmpty(this.state.input)
            ? 0
            : parseFloat(this.state.input);

          const new_item = this.onAddItem({
            item: item.product,
            quantity: item.quantity,
            line_discount_rate: discount_rate,
            user: this.props.auth.user,
            authorized_by: user,
            order: item.order,
            price: item.price,
          });

          items.splice(item_index, 1, new_item);

          this.setState({
            items,
            input: "",
          });
          this.focusInput();
        }, true);
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

      if (item.is_senior) {
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
          price: item.price,
        });

        items.splice(item_index, 1, new_item);

        this.setState({
          items,
          input: "",
        });
        this.focusInput();
      } else {
        this.userLoginForm.current.open((user) => {
          this.seniorDiscountModal.current.open(
            ({ seniors, no_of_persons }) => {
              const new_item = this.onAddItem({
                item: item.product,
                quantity: item.quantity,
                line_discount_rate: 0,
                is_senior: !item.is_senior,
                seniors,
                no_of_persons: parseInt(no_of_persons, 10),
                user: this.props.auth.user,
                authorized_by: user,
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
          );
        }, true);
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

    this.userLoginForm.current.open((user) => {
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
          price: item.price,
        });

        new_items = [...new_items, new_item];
      });

      this.setState({
        input: "",
        discount_rate,
        items: new_items,
      });
      this.inputRef.current.focus();
    }, true);
  };

  onApplyGlobalSeniorDiscount = () => {
    if (this.state.items && this.state.items.length > 0) {
      this.userLoginForm.current.open((user) => {
        this.seniorDiscountModal.current.open(({ seniors, no_of_persons }) => {
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
        });
      }, true);
    } else {
      message.error("No items to be given discount");
      this.focusInput();
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

  onAddCheck = () => {
    this.checkModalForm.current.open((check) => {
      const payments = {
        ...this.state.payments,
        checks: [...(this.state.payments?.checks || []), check],
      };

      this.setState({
        payments,
      });
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

      this.setState({
        payments,
      });
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
          payment,
        ],
      };

      this.setState({
        payments,
      });
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

  onSelectAccount = () => {
    this.accountModalForm.current.open(({ account, is_other_set }) => {
      //get all sales charge to the given account
      const form_data = {
        account,
        is_other_set,
      };
      axios
        .post(`/api/accounts/${account._id}/balance`, form_data)
        .then((response) => {
          const { balance } = response.data;
          this.setState({
            account,
            customer: {
              customer_name: `${account.name}/${account.company_name}`,
              balance,
            },
          });
        })
        .catch((err) =>
          message.error("You have some problem loading accounts")
        );

      this.focusInput();
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

      this.setState({
        payments,
      });
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
          ...this.state.payments.credit_cards,
          {
            credit_card,
          },
        ],
      };

      this.setState({
        payments,
      });
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
    return;
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

    const loading = message.loading("Loading...");
    axios
      .post("/api/products/sku", form_data)
      .then(async ({ data }) => {
        loading();
        if (data) {
          if (quantity < 0) {
            message.error("Unable to return item(s)");

            /* this.returnForm.current.open(returns => {
              const item = this.onAddItem({
                item: data,
                quantity
              });

              this.setState({
                input: "",
                items: [
                  {
                    ...item,
                    returns
                  },
                  ...this.state.items
                ],
                amount_due_label: "AMOUNT DUE",
                change: null
              });
            }); */
            this.focusInput();
          } else {
            const price = await getProductTieupPrice({
              product: data,
              tieup: this.props.pos.table?.tieup_information?.tieup,
            });

            const item = this.onAddItem({
              item: data,
              quantity,
              price,
            });

            this.setState({
              input: "",
              items: [item, ...this.state.items],
              amount_due_label: "AMOUNT DUE",
              change: null,
            });
            this.inputRef.current.focus();
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
    let quantity = 1;
    const price = await getProductTieupPrice({
      product: item,
      tieup: this.props.pos.table?.tieup_information?.tieup,
    });
    const new_item = this.onAddItem({ item, quantity, price });

    this.setState({
      input: "",
      items: [new_item, ...this.state.items],
      amount_due_label: "AMOUNT DUE",
      change: null,
    });
    this.inputRef.current.focus();
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
    });
    this.inputRef.current.focus();
  };

  onReprint = () => {
    const input = this.state.input;

    if (isEmpty(input)) {
      /**
       * reprint latest
       */

      const loading = message.loading("Processing...");
      axios
        .post("/api/account-collections/reprint/latest")
        .then(() => {
          loading();
          message.success("Collection Receipt reprinted");
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

      this.userLoginForm.current.open((user) => {
        const loading = message.loading("Processing...");
        axios
          .post(`/api/account-collections/reprint/${input}`)
          .then(() => {
            loading();
            message.success("Collection Receipt reference reprinted");
            this.setState({
              input: "",
            });
            this.focusInput();
          })
          .catch((err) => {
            message.error("Collection Receipt reference not found");
            this.setState({
              input: "",
            });
            this.focusInput();
          });
      }, true);
    }
  };

  onXread = () => {
    const input = this.state.input;

    this.userLoginForm.current.open((user) => {
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
    }, true);
  };

  onZread = () => {
    const input = this.state.input;

    this.userLoginForm.current.open(async (user) => {
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
    }, true);
  };

  onVoidCollection = () => {
    let account_collection_no = this.state.input;

    if (isEmpty(account_collection_no)) {
      message.error("Please enter Collection # to void");
      this.focusInput();
      return;
    }

    this.voidSaleReasonModal.current.open((reason) => {
      this.userLoginForm.current.open((user) => {
        const form_data = {
          user: this.props.auth.user,
          authorized_by: user,
          reason,
        };

        axios
          .delete(`/api/sales/${account_collection_no}/account-collection-no`, {
            data: {
              ...form_data,
            },
          })
          .then((response) => {
            message.success("Collection  Voided");
            this.setState({ input: "" });
            this.focusInput();
          })
          .catch((err) => {
            message.error(err.response.data.msg);
            this.focusInput();
          });
      }, true);
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
        /*       this.focusInput(); */
      }
    );
  };

  onPaymentAmountChange = ({ record, index, value }) => {
    const items = [...this.state.items];
    items[index] = {
      ...items[index],
      payment_amount: value,
    };

    this.setState({ items });
  };

  render() {
    const records_column = [
      {
        title: "ITEM",
        dataIndex: "item_display",
      },

      {
        title: "AMOUNT",
        dataIndex: "net_amount",
        align: "right",
        render: (value) => <span>{value && numberFormat(value)}</span>,
        width: 150,
      },
      {
        title: "PAYMENT AMOUNT",
        dataIndex: "payment_amount",
        align: "center",
        width: 200,
        render: (payment_amount, record, index) => (
          <span>
            {!isEmpty(record.charge_to_account) && (
              <Input
                className="has-text-right"
                value={payment_amount}
                onChange={(e) =>
                  this.onPaymentAmountChange({
                    record,
                    index,
                    value: e.target.value,
                  })
                }
                onKeyDown={this.onKeyDown}
              />
            )}
          </span>
        ),
      },
    ];

    return (
      <div className="is-flex container-is-fullheight">
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

        <AccountModalForm
          ref={this.accountModalForm}
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

        <InputModal
          title="Void Collection Reason"
          placeholder="Reason"
          ref={this.voidSaleReasonModal}
        />

        <SearchProductModal
          onSearchProductSelect={this.onSearchProductSelect}
          ref={this.searchProductModal}
          onCancel={() => this.focusInput()}
        />

        <SearchTableModal
          onSearchTableSelect={this.onSearchTableSelect}
          ref={this.searchTableModal}
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
                      ...(this.state.items || []).map((item) => {
                        return {
                          ...item,
                          item_display: (
                            <div>
                              SI#{item?.sales?.sales_id} /{" "}
                              {moment(item?.sales?.datetime).format("LLL")} /{" "}
                              {numberFormat(item?.charge_to_account?.amount)}
                            </div>
                          ),
                        };
                      }),
                      ...(this.state.payments.credit_cards || []).map(
                        (item) => {
                          return {
                            ...item,
                            item_display: (
                              <div>
                                {item.credit_card?.name} <br />
                                {item.credit_card?.card}
                              </div>
                            ),
                            net_amount: `(${numberFormat(
                              item?.credit_card?.amount
                            )})`,
                          };
                        }
                      ),
                      ...(this.state.payments.checks || []).map((item) => {
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
                      ...(this.state.payments.online_payments || []).map(
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
                        this.state.payments.free_of_charge_payments || []
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
                      ...(this.state.payments.charge_to_accounts || []).map(
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
                      ...(this.state.payments.gift_checks || []).map((item) => {
                        return {
                          ...item,
                          item_display: (
                            <div>
                              <div>
                                GC : {item.gift_check?.items?.gift_check_number}
                              </div>
                            </div>
                          ),
                          net_amount: `(${numberFormat(item.amount)})`,
                        };
                      }),
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
                style={{ flex: 4, backgroundColor: "#fff", padding: "16px" }}
              >
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
                <Row>
                  <Col span={10}>BALANCE</Col>
                  <Col span={14} className="has-text-right">
                    {this.state?.customer?.balance &&
                      numberFormat(this.state.customer?.balance)}
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
          {[USER_ADMIN, USER_OWNER].includes(this.props.auth.user.role) && (
            <div
              className="cashier-buttons"
              onClick={() => this.props.history.push("/products")}
            >
              <div className="has-text-centered">Admin Panel</div>
            </div>
          )}

          <div
            className="cashier-buttons"
            onClick={() => this.props.history.push("/cashier-tables")}
          >
            <div className="has-text-centered">Ordering</div>
          </div>
          <div
            className="cashier-buttons"
            onClick={() => this.props.history.push("/cashier")}
          >
            <div className="has-text-centered">Cashiering</div>
          </div>
          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.props.logoutUser();
                this.props.history.push("/");
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
                if (!isEmpty(this.state.table)) {
                  message.error("Unable to delete item");
                  return;
                }

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
                this.onVoidCollection();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F4</span> <br />
                Void Collection
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onSelectAccount();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">F9 </span> <br />
                Select Account
              </div>
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                this.onAddCreditCard();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold">SHFT F9</span> <br />
                Add Credit Card
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
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
            </div>
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                //this.onFreeOfChargePayment();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> </span> <br />
                {/* F.O.C */}
              </div>
            </div>
          </div>

          <div className="is-flex flex-row">
            <div
              className="cashier-buttons flex-1"
              onClick={() => {
                //this.onGiftCheckPayment();
              }}
            >
              <div className="has-text-centered">
                <span className="has-text-weight-bold"> </span>
                {/* G.C. */}
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
          </div>

          <div
            className="cashier-buttons"
            onClick={() => {
              this.onFinish({
                is_deposit: true,
              });
            }}
          >
            <div className="has-text-centered">
              <span className="has-text-weight-bold">F10</span> <br />
              Finish
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
})(withRouter(CashierCollectionForm));
