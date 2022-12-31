import React from "react";
import PropTypes from "prop-types";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import { Form, DatePicker } from "antd";

const DatePickerFieldGroup = ({
  label,
  name,
  value,
  error,
  disabled,
  inputRef,
  formItemLayout,
  onChange,
  disabledDate,
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <DatePicker
      disabledDate={disabledDate}
      disabled={disabled}
      onChange={onChange}
      name={name}
      value={value}
      ref={inputRef}
    />
  </Form.Item>
);

DatePickerFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inputRef: PropTypes.func,
  disabled: PropTypes.bool,
};

DatePickerFieldGroup.defaultProps = {
  disabled: false,
};

export default DatePickerFieldGroup;
