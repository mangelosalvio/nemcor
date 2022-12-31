import React, { Component } from "react";

import axios from "axios";
import { connect } from "react-redux";

import { Layout, Form, Breadcrumb, message } from "antd";

import { formItemLayout } from "../../utils/Layouts";

import TimePickerFieldGroup from "../../commons/TimePickerFieldGroup";
import {
  SETTING_STORE,
  OPENING_TIME,
  CLOSING_TIME,
  SETTING_MAIN_WAREHOUSE,
} from "./../../utils/constants";
import TextFieldGroup from "../../commons/TextFieldGroup";

import SelectFieldGroup from "../../commons/SelectFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
const { Content } = Layout;

const form_data = {
  errors: {},
  category: [],
  discounted_beg_bal_categ_items: [],
  branch: "",
  opening_time: null,
  closing_time: null,
};

class SettingForm extends Component {
  state = {
    title: "Settings",
    ...form_data,
  };

  componentDidMount = () => {
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
    } else if (prevState.main_warehouse !== this.state.main_warehouse) {
      this.onChange({
        key: SETTING_MAIN_WAREHOUSE,
        value: this.state.main_warehouse,
      });
    } else if (prevState.store !== this.state.closing_time) {
      this.onChange({ key: SETTING_STORE, value: this.state.store });
    }
  }

  onChange = ({ key, value }) => {
    const form_data = {
      key,
      value,
    };
    axios.post("/api/account-settings", form_data);
  };

  render() {
    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Application Settings</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              {this.state.title}
            </span>
          </div>

          <Form>
            <TimePickerFieldGroup
              label="Opening Time"
              name="opening_time"
              value={this.state.opening_time}
              onChange={(value) => this.setState({ opening_time: value })}
              error={errors.opening_time}
              formItemLayout={formItemLayout}
              showTime={true}
            />
            <TimePickerFieldGroup
              label="Closing Time"
              name="closing_time"
              value={this.state.closing_time}
              onChange={(value) => this.setState({ closing_time: value })}
              error={errors.closing_time}
              formItemLayout={formItemLayout}
              showTime={true}
            />

            <TextAreaGroup
              label="Receipt Footer"
              name="receipt_footer"
              error={errors.receipt_footer}
              formItemLayout={formItemLayout}
              value={this.state.receipt_footer}
              onChange={(e) => {
                this.setState({
                  receipt_footer: e.target.value,
                });
              }}
              rows={5}
              className="has-text-centered"
              onBlur={() => {
                this.onChange({
                  key: "receipt_footer",
                  value: this.state.receipt_footer,
                });
                message.success("Setting Field Updated");
              }}
            />
          </Form>
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

export default connect(mapToState)(SettingForm);
