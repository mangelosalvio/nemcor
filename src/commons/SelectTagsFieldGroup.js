import React from "react";
import PropTypes from "prop-types";
import { Form, Select, Divider } from "antd";
import { PlusOutlined } from "@ant-design/icons";
const Option = Select.Option;

const SelectTagFieldGroup = ({
  label,
  error,
  name,
  value,
  onChange,
  formItemLayout,
  autoFocus,
  inputRef,
  onSearch,
  options,
}) => (
  <Form.Item
    name={name}
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <div>
      <Select
        mode="tags"
        value={value}
        onChange={onChange}
        onSearch={onSearch}
        autoFocus={autoFocus}
        ref={inputRef}
        options={options}
      />
    </div>
  </Form.Item>
);

SelectTagFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
  autoFocus: PropTypes.bool,
  column: PropTypes.string,
};

SelectTagFieldGroup.defaultProps = {
  autoFocus: false,
};

export default SelectTagFieldGroup;
