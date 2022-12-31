import React from "react";
import PropTypes from "prop-types";
import { Select, Form, Divider, Icon } from "antd";
import { PlusOutlined } from "@ant-design/icons";
const { Option } = Select;

const SimpleSelectFieldGroup = ({
  size,
  label,
  error,
  formItemLayout,
  name,
  value,
  onChange,
  options,
  onAddItem,
  onSearch,
  showSearch,
  column,
  inner_column,
  inputRef,
  disabled,
}) => (
  <Form.Item
    label={label}
    validateStatus={error ? "error" : ""}
    help={error}
    {...formItemLayout}
  >
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <Select
        disabled={disabled}
        size={size}
        showSearch={showSearch}
        name={name}
        value={value}
        onChange={onChange}
        onSearch={onSearch}
        ref={inputRef}
        allowClear={true}
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
        {options.map((o, index) => (
          <Option key={index} value={o}>
            {column && inner_column ? o[column][inner_column] : o}
          </Option>
        ))}
      </Select>
    </div>
  </Form.Item>
);

SimpleSelectFieldGroup.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  dropdownRender: PropTypes.func,
};

SimpleSelectFieldGroup.defaultProps = {
  showSearch: false,
};

export default SimpleSelectFieldGroup;
