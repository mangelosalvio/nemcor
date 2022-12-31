import React, { Component } from "react";
import { Form, Input, Modal, message } from "antd";
import axios from "axios";
import isEmpty from "../validation/is-empty";

let callback;
export default class GiftCheckForm extends Component {
  state = {
    gift_check_number: "",
    visible: false,
    table: null,
  };

  constructor(props) {
    super(props);
    this.gift_check_input = React.createRef();
  }

  open = (c, table) => {
    this.setState({ visible: true, table }, () => {
      if (this.gift_check_input.current) {
        this.gift_check_input.current.focus();
      }
    });

    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    if (isEmpty(this.state.gift_check_number)) {
      message.error("Gift check number empty");
      return;
    }

    axios
      .post(`/api/gift-checks/${this.state.gift_check_number}/use`, {
        table: this.state.table,
      })
      .then((response) => {
        callback(response.data);
        this.setState({ visible: false, gift_check_number: "" });
      })
      .catch((err) => {
        message.error("Invalid gift check");
      });
  };

  render() {
    return (
      <div>
        <Modal
          title="Gift Check Form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="gift_check_number"
                  placeholder="Gift Check Number"
                  value={this.state.gift_check_number}
                  onChange={this.onChange}
                  autoFocus={true}
                  ref={this.gift_check_input}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
