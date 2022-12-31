import React from "react";
import PropTypes from "prop-types";
import { Form, Radio } from "antd";
const RadioGroup = Radio.Group;

const RadioGroupFieldGroup = ({
  label,
  error,
  name,
  value,
  onChange,
  inputRef,
  formItemLayout,
  options,
  defaultValue
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <RadioGroup
      name={name}
      options={options}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      ref={inputRef}
    />
  </Form.Item>
);

RadioGroupFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func,
  inputRef: PropTypes.func,
  options: PropTypes.array,
  defaultValue: PropTypes.string,
  value: PropTypes.string
};

RadioGroupFieldGroup.defaultProps = {};

export default RadioGroupFieldGroup;
