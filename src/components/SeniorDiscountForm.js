import React, { Component } from "react";
import { Form, Icon, Input, Modal, message } from "antd";

let callback;
export default class SeniorDiscountForm extends Component {
  state = {
    number_of_persons: "",
    number_of_seniors: "",
    visible: false
  };

  open = c => {
    this.setState({ visible: true });
    callback = c;
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();
    const number_of_persons = parseInt(this.state.number_of_persons, 10);
    const number_of_seniors = parseInt(this.state.number_of_seniors, 10);

    if (number_of_seniors > number_of_persons) {
      message.error("Invalid input");
    } else {
      callback({
        number_of_persons,
        number_of_seniors
      });
      this.setState({
        visible: false,
        number_of_persons: "",
        number_of_seniors: ""
      });
    }
  };

  render() {
    return (
      <div>
        <Modal
          title="Senior Discount form"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
        >
          <div>
            <Form onSubmit={this.onSubmit} className="login-form">
              <Form.Item>
                <Input
                  name="number_of_seniors"
                  prefix={
                    <Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />
                  }
                  placeholder="# of seniors"
                  value={this.state.number_of_seniors}
                  onChange={this.onChange}
                />
              </Form.Item>
              <Form.Item>
                <Input
                  prefix={
                    <Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />
                  }
                  name="number_of_persons"
                  placeholder="# of Persons"
                  value={this.state.number_of_persons}
                  onChange={this.onChange}
                />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </div>
    );
  }
}
