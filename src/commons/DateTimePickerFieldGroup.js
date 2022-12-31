import React from "react";
import PropTypes from "prop-types";
import { Form } from "antd";
import { MuiPickersUtilsProvider, DateTimePicker } from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";

const DateTimePickerFieldGroup = ({
  label,
  error,
  formItemLayout,
  onChange,
  value
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <MuiPickersUtilsProvider utils={MomentUtils}>
      <DateTimePicker
        value={value}
        onChange={onChange}
        style={{ fontSize: "14px" }}
        format="MM/DD/YYYY hh:mm A"
        InputProps={{
          disableUnderline: true
        }}
      />
    </MuiPickersUtilsProvider>
  </Form.Item>
);

DateTimePickerFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inputRef: PropTypes.func,
  disabled: PropTypes.bool,
  showTime: PropTypes.bool
};

DateTimePickerFieldGroup.defaultProps = {
  disabled: false,
  showTime: false
};

export default DateTimePickerFieldGroup;
