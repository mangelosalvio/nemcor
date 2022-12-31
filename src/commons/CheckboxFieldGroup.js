import React from "react";
import PropTypes from "prop-types";
import { Form, Checkbox } from "antd";

const CheckboxFieldGroup = ({
  label,
  error,
  name,
  onChange,
  checked,
  disabled,
  inputRef,
  formItemLayout
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <Checkbox
      disabled={disabled}
      onChange={onChange}
      name={name}
      ref={inputRef}
      checked={checked}
    />
  </Form.Item>
);

CheckboxFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  inputRef: PropTypes.func
};

CheckboxFieldGroup.defaultProps = {
  text: "text"
};

export default CheckboxFieldGroup;
