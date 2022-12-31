import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import isEmpty from "../validation/is-empty";

let callback;
export default class ReturnForm extends Component {
  state = {
    sales_id: "",
    remarks: "",
    visible: false,
    errors: {},
  };

  constructor(props) {
    super(props);
    this.salesInvoiceNumberInput = React.createRef();
    this.remarksInput = React.createRef();
  }
  open = (c) => {
    this.setState({ visible: true }, () => {
      setTimeout(() => {
        if (this.salesInvoiceNumberInput.current) {
          this.salesInvoiceNumberInput.current.focus();
        }
      }, 300);
    });
    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.sales_id)) {
      message.error("SI # is required");
      return;
    }

    const { sales_id, remarks } = this.state;

    callback({
      sales_id,
      remarks,
    });

    this.setState({
      visible: false,
      sales_id: "",
      remarks: "",
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Return Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="sales_id"
                  placeholder="SI No."
                  value={this.state.sales_id}
                  onChange={this.onChange}
                  ref={this.salesInvoiceNumberInput}
                  autoComplete="off"
                  autoFocus={true}
                  onPressEnter={() => this.remarksInput.current.focus()}
                />
              </Form.Item>
              <Form.Item>
                <Input
                  name="remarks"
                  placeholder="Remarks"
                  value={this.state.remarks}
                  onChange={this.onChange}
                  ref={this.remarksInput}
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
