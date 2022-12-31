import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";
import round from "../utils/round";

let callback;

const defaultState = {
  depository: null,
  reference: null,
  amount: null,
};

export default class OnlinePaymentModalForm extends Component {
  state = {
    ...defaultState,

    visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);

    this.depositoryRef = React.createRef();
    this.referenceRef = React.createRef();
    this.amountRef = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      if (this.depositoryRef.current) {
        this.depositoryRef.current.focus();
      }
    });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.depository)) {
      message.error("Depository is required");
      return;
    }

    if (isEmpty(this.state.reference)) {
      message.error("Reference is required");
      return;
    }

    if (isEmpty(this.state.amount)) {
      message.error("Amount is required");
      return;
    }

    const { depository, reference, amount } = this.state;

    callback({
      depository,
      reference,
      amount: round(amount),
    });

    this.setState({
      visible: false,
      ...defaultState,
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Online Payment"
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
                <Input
                  name="depository"
                  placeholder="Depository"
                  value={this.state.depository}
                  onChange={this.onChange}
                  ref={this.depositoryRef}
                  onPressEnter={() => this.referenceRef.current.focus()}
                  autoFocus={true}
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="reference"
                  placeholder="Reference"
                  value={this.state.reference}
                  onChange={this.onChange}
                  ref={this.referenceRef}
                  onPressEnter={() => this.amountRef.current.focus()}
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
                  ref={this.amountRef}
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
