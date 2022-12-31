import React from "react";
import PropTypes from "prop-types";
import { Form } from "antd";
import {
  MuiPickersUtilsProvider,
  KeyboardTimePicker
} from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";

const TimePickerFieldGroup = ({
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
      <KeyboardTimePicker
        value={value}
        onChange={onChange}
        style={{ fontSize: "14px" }}
        InputProps={{
          disableUnderline: true
        }}
      />
    </MuiPickersUtilsProvider>
  </Form.Item>
);

TimePickerFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inputRef: PropTypes.func,
  disabled: PropTypes.bool,
  showTime: PropTypes.bool
};

TimePickerFieldGroup.defaultProps = {
  disabled: false,
  showTime: false
};

export default TimePickerFieldGroup;
