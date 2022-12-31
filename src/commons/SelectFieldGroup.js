import React from "react";
import PropTypes from "prop-types";
import { Form, Select, Divider } from "antd";
import { PlusOutlined } from "@ant-design/icons";
const Option = Select.Option;

const SelectFieldGroup = ({
  label,
  error,
  name,
  value,
  onChange,
  onSelect,
  placeholder,
  formItemLayout,
  onSearch,
  data,
  autoFocus,
  inputRef,
  column,
  onAddItem,
  disabled,
  help,
  loading = false,
}) => (
  <Form.Item
    name={name}
    label={label}
    validateStatus={error ? "error" : ""}
    help={error ? error : help}
    {...formItemLayout}
  >
    <div>
      <Select
        loading={loading}
        disabled={disabled}
        showSearch
        value={value}
        notFoundContent="No records found"
        placeholder={placeholder}
        filterOption={false}
        onSelect={onSelect}
        onSearch={onSearch}
        onChange={onChange}
        allowClear={true}
        autoFocus={autoFocus}
        ref={inputRef}
        dropdownRender={(menu) => (
          <div>
            {menu}
            {onAddItem && typeof onAddItem === "function" && (
              <div>
                <Divider style={{ margin: "4px 0" }} />

                <div
                  style={{ padding: "8px", cursor: "pointer" }}
                  onClick={onAddItem}
                >
                  <PlusOutlined /> Add item
                </div>
              </div>
            )}
          </div>
        )}
      >
        {(data || []).map((d, index) => (
          <Option key={index} value={index}>
            {d[column]}
          </Option>
        ))}
      </Select>
    </div>
  </Form.Item>
);

SelectFieldGroup.propTypes = {
  error: PropTypes.string,
  placeholder: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
  autoFocus: PropTypes.bool,
  column: PropTypes.string,
};

SelectFieldGroup.defaultProps = {
  autoFocus: false,
  column: "name",
};

export default SelectFieldGroup;
