import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import axios from "axios";
import isEmpty from "../validation/is-empty";
import SimpleSelectFieldGroup from "../commons/SimpleSelectFieldGroup";
import round from "../utils/round";
import RadioGroupFieldGroup from "../commons/RadioGroupFieldGroup";
import { CREDIT, DEBIT } from "../utils/constants";
import { bank_options } from "../utils/Options";

let callback;
export default class CreditCardForm extends Component {
  state = {
    card_type: CREDIT,
    name: "",
    card_number: "",
    card: "",
    reference_number: "",
    approval_code: "",
    amount: "",
    bank: "",
    visible: false,
    credit_card_options: [],
    errors: {},
  };

  constructor(props) {
    super(props);
    this.cardInput = React.createRef();
    this.cardNumberInput = React.createRef();
    this.referenceNumberInput = React.createRef();
    this.approvalCodeInput = React.createRef();
    this.amountInput = React.createRef();
    this.cardNameInput = React.createRef();
    this.bankInput = React.createRef();
  }

  componentDidMount() {
    axios
      .get("/api/credit-cards")
      .then((response) => {
        this.setState({ credit_card_options: response.data });
      })
      .catch((err) => console.log(err));
  }

  open = (c) => {
    this.setState({ visible: true, bank: "METROBANK" }, () => {
      if (this.cardInput.current) {
        this.cardInput.current.focus();
      }
    });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const {
      card_type,
      card_number,
      card,
      reference_number,
      approval_code,
      amount,
      bank,
      name,
    } = this.state;

    if (isEmpty(card)) {
      message.error("CARD  is required");
      return;
    }

    if (isEmpty(card_number)) {
      message.error("CARD NUMBER is required");
      return;
    }

    if (isEmpty(this.state.approval_code)) {
      message.error("TRACE NUMBER is required");
      return;
    }

    if (isEmpty(this.state.amount)) {
      message.error("Amount is required");
      return;
    }

    callback({
      card_type,
      card_number,
      card,
      reference_number,
      approval_code,
      amount: round(amount),
      name,
      bank,
    });

    this.setState({
      card_type: CREDIT,
      visible: false,
      card_number: "",
      card: "",
      reference_number: "",
      approval_code: "",
      amount: "",
      name: "",
      bank: "",
    });
  };

  render() {
    const { errors } = this.state;
    const credit_card_options = (this.state.credit_card_options || []).map(
      (card) => card.name
    );
    return (
      <div>
        <Modal
          title="Credit Card Form"
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
              <Form.Item>
                <Form.Item>
                  <RadioGroupFieldGroup
                    label="Card Type"
                    name="card_type"
                    onChange={this.onChange}
                    error={errors.card_type}
                    value={this.state.card_type}
                    options={[CREDIT, DEBIT]}
                  />
                </Form.Item>
                <SimpleSelectFieldGroup
                  label="Card"
                  name="card"
                  value={this.state.card}
                  onChange={(value) => {
                    this.setState({ card: value });
                    this.cardNameInput.current.focus();
                  }}
                  error={errors.card}
                  options={credit_card_options}
                  autoFocus={true}
                  inputRef={this.cardInput}
                />
              </Form.Item>
              <Form.Item>
                <RadioGroupFieldGroup
                  label="Bank"
                  name="bank"
                  onChange={this.onChange}
                  error={errors.bank}
                  value={this.state.bank}
                  options={bank_options}
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="name"
                  placeholder="Card Name"
                  value={this.state.name}
                  onChange={this.onChange}
                  ref={this.cardNameInput}
                  onPressEnter={() => this.cardNumberInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="card_number"
                  placeholder="Card Number"
                  value={this.state.card_number}
                  onChange={this.onChange}
                  ref={this.cardNumberInput}
                  onPressEnter={() => this.referenceNumberInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="reference_number"
                  placeholder="Reference Number"
                  value={this.state.reference_number}
                  onChange={this.onChange}
                  ref={this.referenceNumberInput}
                  onPressEnter={() => this.approvalCodeInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="approval_code"
                  placeholder="Trace Number"
                  value={this.state.approval_code}
                  onChange={this.onChange}
                  ref={this.approvalCodeInput}
                  onPressEnter={() => this.amountInput.current.focus()}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="amount"
                  type="number"
                  placeholder="Amount"
                  value={this.state.amount}
                  onChange={this.onChange}
                  ref={this.amountInput}
                  onPressEnter={this.onSubmit}
                  autoComplete="off"
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
