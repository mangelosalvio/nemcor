import React from "react";
import PropTypes from "prop-types";
import { Form, Input } from "antd";
const { TextArea } = Input;

const TextAreaGroup = ({
  label,
  error,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  inputRef,
  formItemLayout,
  readOnly,
  autoComplete,
  rows,
  ...props
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <TextArea
      {...props}
      disabled={disabled}
      onChange={onChange}
      name={name}
      placeholder={placeholder}
      value={value}
      ref={inputRef}
      readOnly={readOnly}
      autoComplete={autoComplete}
      rows={rows}
    />
  </Form.Item>
);

TextAreaGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  onChange: PropTypes.func,
  inputRef: PropTypes.func,
  autoComplete: PropTypes.string,
};

TextAreaGroup.defaultProps = {
  text: "text",
  disabled: false,
  readOnly: false,
  autoComplete: "on",
};

export default TextAreaGroup;
