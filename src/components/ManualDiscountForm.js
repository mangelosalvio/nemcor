import React, { Component } from "react";
import { connect } from "react-redux";
import isEmpty from "../validation/is-empty";
import OptionBillingButton from "../commons/OptionBillingButton";
import { withRouter } from "react-router-dom";
import { formItemLayout } from "./../utils/Layouts";
import { setManualDiscount } from "./../actions/posActions";
import UserLoginForm from "./UserLoginForm";
import TextFieldGroup from "../commons/TextFieldGroup";
import { USER_OWNER, USER_ADMIN } from "../utils/constants";

const form_data = {
  discount_rate: "",
  errors: {},
};

class ManualDiscountForm extends Component {
  state = {
    ...form_data,
  };

  constructor(props) {
    super(props);
    this.userLoginForm = React.createRef();
    this.discount_rate_field = React.createRef();
  }

  componentDidMount() {
    if (isEmpty(this.props.pos.table._id)) {
      this.props.history.push("/cashier-tables");
    }
    this.discount_rate_field.current.focus();
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
    this.userLoginForm.current.open(
      (user) => {
        this.props.setManualDiscount({
          table: this.props.pos.table,
          history: this.props.history,
          discount_rate: this.state.discount_rate,
          user: this.props.auth.user,
          authorized_by: user,
        });
      },
      [USER_OWNER, USER_ADMIN],
      "Authentication Required for MANUAL DISCOUNT"
    );
  };

  render() {
    const { errors } = this.state;

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
                    MANUAL DISCOUNT <br />
                    <span>Table # {this.props.pos.table.name}</span>
                  </span>
                </div>
                <div className="columns">
                  <div className="column is-11">
                    <TextFieldGroup
                      label="Discount"
                      name="discount_rate"
                      value={this.state.discount_rate}
                      onChange={this.onChange}
                      error={errors.discount_rate}
                      formItemLayout={formItemLayout}
                      onPressEnter={() => this.onUpdate()}
                      inputRef={this.discount_rate_field}
                      type="number"
                      autoComplete="off"
                    />

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
  setManualDiscount,
})(withRouter(ManualDiscountForm));
