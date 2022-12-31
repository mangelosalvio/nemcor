import React, { Component } from "react";
import { connect } from "react-redux";
import isEmpty from "../validation/is-empty";
import OptionBillingButton from "../commons/OptionBillingButton";
import { withRouter } from "react-router-dom";
import { formItemLayout } from "./../utils/Layouts";
import {
  applySummary,
  processSale,
  setAccount,
  addGiftCheck,
  addCreditCard,
  setSeniorDiscount,
  removeDiscount,
  removeAccount,
  updateTable,
  updateSelectedOrderQuantity,
  updateTableOrder,
  deleteTableOrder,
} from "./../actions/posActions";
import { Icon, message, Divider, Table } from "antd";
import UserLoginForm from "./UserLoginForm";
import TextFieldGroup from "../commons/TextFieldGroup";
const form_data_senior = {
  senior_name: "",
  senior_number: "",
};

const form_data = {
  number_of_persons: "",
  senior: {
    ...form_data_senior,
  },
  seniors: [],
  errors: {},
};

class SeniorBillingForms extends Component {
  state = {
    ...form_data,
  };

  constructor(props) {
    super(props);
    this.userLoginForm = React.createRef();
    this.number_of_persons_form = React.createRef();
    this.senior_number_form = React.createRef();
    this.senior_name_form = React.createRef();
  }

  componentDidMount() {
    if (isEmpty(this.props.pos.table._id)) {
      this.props.history.push("/cashier-tables");
    }
    this.number_of_persons_form.current.focus();
  }

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onObjectChange = (object, e) => {
    this.setState({
      [object]: {
        ...this.state[object],
        [e.target.name]: e.target.value,
      },
    });
  };

  onBack = () => {
    this.props.history.push("/billing");
  };

  onCancel = () => {
    this.setState({
      modal_is_visible: false,
    });
  };

  onUpdate = () => {
    if (this.state.number_of_persons < this.state.seniors.length) {
      message.error(
        "Invalid input, number of seniors is greater than number of persons"
      );
    } else {
      this.props.setSeniorDiscount({
        seniors: this.state.seniors,
        number_of_persons: this.state.number_of_persons,
        table: this.props.pos.table,
        history: this.props.history,
        user: this.props.auth.user,
        authorized_by: this.props.auth.user,
      });

      /* this.userLoginForm.current.open(
        (user) => {
          this.props.setSeniorDiscount({
            seniors: this.state.seniors,
            number_of_persons: this.state.number_of_persons,
            table: this.props.pos.table,
            history: this.props.history,
            user: this.props.auth.user,
            authorized_by: user,
          });
        },
        true,
        "Authentication Required for SENIOR CITIZEN/PWD DISCOUNT"
      ); */
    }
  };

  onAddSenior = () => {
    if (isEmpty(this.state.senior.senior_name)) {
      message.error("Please supply senior name");
      return;
    }

    if (isEmpty(this.state.senior.senior_number)) {
      message.error("Please supply senior number");
      return;
    }

    const seniors = [
      ...this.state.seniors,
      {
        ...this.state.senior,
      },
    ];

    this.setState(
      {
        seniors,
        senior: {
          ...form_data_senior,
        },
      },
      () => {
        this.senior_number_form.current.focus();
      }
    );
  };

  onDeleteSenior = (record, index) => {
    const seniors = [...this.state.seniors];
    seniors.splice(index, 1);
    this.setState({ seniors }, () => {
      this.senior_number_form.current.focus();
    });
  };

  render() {
    const { errors } = this.state;

    const seniors_column = [
      {
        title: "Senior Number",
        dataIndex: "senior_number",
      },
      {
        title: "Name",
        dataIndex: "senior_name",
      },
      {
        title: "",
        key: "action",
        width: 100,
        render: (text, record, index) => (
          <span>
            <Icon
              type="delete"
              theme="filled"
              className="pointer"
              onClick={() => this.onDeleteSenior(record, index)}
            />
          </span>
        ),
      },
    ];

    const seniors = this.state.seniors.map((o, index) => {
      return {
        ...o,
        key: index,
      };
    });

    return (
      <div className="container box container-is-fullheight">
        <UserLoginForm ref={this.userLoginForm} />
        <div className="columns container-is-fullheight">
          <div className="column is-9 columns flex-column container-is-fullheight">
            <div className="flex-1" style={{ overflow: "auto" }}>
              <div className="has-text-centered">
                <div>
                  <span
                    style={{ fontSize: "32px" }}
                    className="has-text-weight-bold"
                  >
                    SENIOR DISCOUNT APPLICATIONS <br />
                    <span>Table # {this.props.pos.table.name}</span>
                  </span>
                </div>
                <div className="columns">
                  <div className="column is-11">
                    <TextFieldGroup
                      label="# of Persons"
                      name="number_of_persons"
                      value={this.state.number_of_persons}
                      onChange={this.onChange}
                      error={errors.number_of_persons}
                      formItemLayout={formItemLayout}
                      onPressEnter={(e) =>
                        this.senior_number_form.current.focus()
                      }
                      inputRef={this.number_of_persons_form}
                      autoComplete="off"
                    />

                    <Divider>SENIOR DETAILS</Divider>
                    <TextFieldGroup
                      label="Senior Number"
                      name="senior_number"
                      value={this.state.senior.senior_number}
                      onChange={(e) => this.onObjectChange("senior", e)}
                      error={errors.senior_number}
                      formItemLayout={formItemLayout}
                      inputRef={this.senior_number_form}
                      onPressEnter={(e) =>
                        this.senior_name_form.current.focus()
                      }
                      autoComplete="off"
                    />
                    <TextFieldGroup
                      label="Senior Name"
                      name="senior_name"
                      value={this.state.senior.senior_name}
                      onChange={(e) => this.onObjectChange("senior", e)}
                      error={errors.senior_name}
                      formItemLayout={formItemLayout}
                      inputRef={this.senior_name_form}
                      onPressEnter={(e) => this.onAddSenior()}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
              <div className="columns">
                <div className="is-8 column">
                  <Table dataSource={seniors} columns={seniors_column} />
                </div>
                <div className="is-3 column">
                  <div
                    className="has-text-centered"
                    style={{ marginTop: "32px" }}
                  >
                    <input
                      type="button"
                      className="button is-primary update-button"
                      value="Update"
                      onClick={this.onUpdate}
                      style={{
                        height: "80px",
                        width: "100%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="column is-3" style={{ padding: "1rem" }}>
            <div className="columns is-multiline">
              <OptionBillingButton
                label="Back"
                icon="fas fa-angle-left"
                onClick={this.onBack}
              />
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
  applySummary,
  processSale,
  setAccount,
  addGiftCheck,
  addCreditCard,
  setSeniorDiscount,
  removeDiscount,
  removeAccount,
  updateTable,
  updateSelectedOrderQuantity,
  updateTableOrder,
  deleteTableOrder,
})(withRouter(SeniorBillingForms));
