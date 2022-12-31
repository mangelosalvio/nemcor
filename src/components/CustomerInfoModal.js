import React, { Component } from "react";
import { Form, Input, Modal } from "antd";
import { onCustomerSearch } from "../utils/utilities";
import SelectFieldGroup from "../commons/SelectFieldGroup";

let callback;

const form_data = {
  customer_name: "",
  address: "",
  tin: "",
  business_style: "",
  osaca_pwd_no: "",
};

export default class CustomerInfoModal extends Component {
  state = {
    input: "",
    visible: false,
    ...form_data,
  };

  constructor(props) {
    super(props);
    this.customerNameField = React.createRef();
    this.addressField = React.createRef();
    this.tinField = React.createRef();
    this.businessStyleField = React.createRef();
    this.osacaPwdField = React.createRef();
    this.selectCustomerField = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      setTimeout(() => {
        if (this.selectCustomerField.current) {
          this.selectCustomerField.current.focus();
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

    const customer = {
      customer: this.state.customer,
      customer_name: this.state.customer_name,
      address: this.state.address,
      tin: this.state.tin,
      business_style: this.state.business_style,
      osaca_pwd_no: this.state.osaca_pwd_no,
    };

    callback(customer);
    this.setState({ visible: false, input: "", ...form_data });
  };

  render() {
    return (
      <div>
        <Modal
          title="Customer Information"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => {
            this.setState({ visible: false });
            this.props.onCancel();
          }}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <SelectFieldGroup
                  value={this.state.customer?.name}
                  inputRef={this.selectCustomerField}
                  onSearch={(value) =>
                    onCustomerSearch({
                      value,
                      setOptions: (fn) => {
                        this.setState(fn);
                      },
                    })
                  }
                  onChange={(index) => {
                    const customer = this.state.customers?.[index] || null;
                    this.setState({
                      customer,
                      customer_name: customer?.name || "",
                    });
                    this.customerNameField.current.focus();
                  }}
                  data={this.state.customers}
                  column="name"
                />

                <Input
                  className="m-t-1"
                  name="customer_name"
                  placeholder="Customer Name"
                  value={this.state.customer_name}
                  onChange={this.onChange}
                  autoFocus={true}
                  ref={this.customerNameField}
                  onPressEnter={(e) => this.addressField.current.focus()}
                  autoComplete="off"
                />
                <Input
                  className="m-t-1"
                  name="address"
                  placeholder="Address"
                  value={this.state.address}
                  onChange={this.onChange}
                  ref={this.addressField}
                  onPressEnter={(e) => this.tinField.current.focus()}
                  autoComplete="off"
                />
                <Input
                  className="m-t-1"
                  name="tin"
                  placeholder="TIN"
                  value={this.state.tin}
                  onChange={this.onChange}
                  ref={this.tinField}
                  onPressEnter={(e) => this.businessStyleField.current.focus()}
                  autoComplete="off"
                />
                <Input
                  className="m-t-1"
                  name="business_style"
                  placeholder="Business Style"
                  value={this.state.business_style}
                  onChange={this.onChange}
                  ref={this.businessStyleField}
                  onPressEnter={(e) => this.osacaPwdField.current.focus()}
                  autoComplete="off"
                />
                <Input
                  className="m-t-1"
                  name="osaca_pwd_no"
                  placeholder="OSACA/PWD No."
                  value={this.state.osaca_pwd_no}
                  onChange={this.onChange}
                  ref={this.osacaPwdField}
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
