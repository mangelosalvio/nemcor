import React, { Component } from "react";

import axios from "axios";
import { connect } from "react-redux";

import { Layout, Form, Breadcrumb, Button, message } from "antd";

import { OPENING_TIME, CLOSING_TIME, MSALVIO } from "./../../utils/constants";
const { Content } = Layout;

const form_data = {
  errors: {},
  category: [],
  discounted_beg_bal_categ_items: [],
  branch: "",
  opening_time: null,
  closing_time: null,
};

class DeveloperSettingsForm extends Component {
  state = {
    title: "Developer Settings",
    ...form_data,
  };

  componentDidMount = () => {
    if (this.props.auth.user.username !== MSALVIO) this.props.history.push("/");

    axios.get("/api/account-settings").then((response) => {
      const settings = response.data;
      settings.forEach((setting) => {
        this.setState({
          [setting.key]: setting.value,
        });
      });
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.opening_time !== this.state.opening_time) {
      this.onChange({ key: OPENING_TIME, value: this.state.opening_time });
    } else if (prevState.closing_time !== this.state.closing_time) {
      this.onChange({ key: CLOSING_TIME, value: this.state.closing_time });
    }
  }

  onChange = ({ key, value }) => {
    const form_data = {
      key,
      value,
    };
    axios.post("/api/account-settings", form_data);
  };

  onTruncateTransactions = () => {
    axios.post("/api/account-settings/truncate-transactions").then(() => {
      message.success("Transactions Truncated.");
    });
  };

  render() {
    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Developer Settings</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              {this.state.title}
            </span>
          </div>

          <div className="m-t-1">
            <Form>
              <Button onClick={() => this.onTruncateTransactions()}>
                Truncate Transactions
              </Button>
            </Form>
          </div>
        </div>
      </Content>
    );
  }
}

const mapToState = (state) => {
  return {
    auth: state.auth,
  };
};

export default connect(mapToState)(DeveloperSettingsForm);
