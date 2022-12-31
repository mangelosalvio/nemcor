import React from "react";
import PropTypes from "prop-types";
import { Form, DatePicker } from "antd";
const { RangePicker } = DatePicker;

const RangeDatePickerFieldGroup = ({
  label,
  name,
  value,
  error,
  disabled,
  inputRef,
  formItemLayout,
  onChange,
  allowClear = true,
  disabledDate,
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <RangePicker
      disabledDate={disabledDate}
      format="MM/DD/YY"
      allowClear={allowClear}
      disabled={disabled}
      onChange={onChange}
      name={name}
      value={value}
      ref={inputRef}
    />
  </Form.Item>
);

RangeDatePickerFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inputRef: PropTypes.func,
  disabled: PropTypes.array,
};

RangeDatePickerFieldGroup.defaultProps = {
  disabled: false,
};

export default RangeDatePickerFieldGroup;
