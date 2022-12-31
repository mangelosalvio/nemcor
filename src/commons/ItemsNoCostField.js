import { Col, Divider, Row } from "antd";

import React, { useEffect, useRef } from "react";
import validator from "validator";
import { DISCOUNT_PERCENT } from "../utils/constants";
import { discount_options } from "../utils/Options";
import round from "../utils/round";
import { onStockInventorySearch, onStockSearch } from "../utils/utilities";
import isEmpty from "../validation/is-empty";
import SelectFieldGroup from "./SelectFieldGroup";
import SimpleSelectFieldGroup from "./SimpleSelectFieldGroup";
import TextFieldGroup from "./TextFieldGroup";

export default function ItemsNoCostField({
  item,
  setItem,
  setState,
  items_key = "items",
  options,
  setOptions,
  errors,
  initialItemValues,
}) {
  const quanttiyField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);

  return (
    <div>
      <Divider orientation="left" key="divider">
        Items
      </Divider>
      <Row key="form" className="ant-form-vertical" gutter="4">
        <Col span={12}>
          <SelectFieldGroup
            key="1"
            inputRef={stockField}
            label="Stock"
            value={item.stock?.name}
            onSearch={(value) => onStockSearch({ value, options, setOptions })}
            onChange={(index) => {
              setItem({
                ...item,
                stock: options.stocks[index],
              });
              quanttiyField.current.focus();
            }}
            error={errors.stock?.name}
            formItemLayout={null}
            data={options.stocks}
            column="display_name"
          />
        </Col>
        <Col span={2}>
          <TextFieldGroup
            label="Qty"
            value={item.quantity}
            onChange={(e) => {
              setItem({
                ...item,
                quantity: validator.isNumeric(e.target.value)
                  ? parseFloat(e.target.value)
                  : e.target.value,
                old_quantity: validator.isNumeric(e.target.value)
                  ? parseFloat(e.target.value)
                  : e.target.value,
              });
            }}
            error={errors.item && errors.item.quantity}
            formItemLayout={null}
            inputRef={quanttiyField}
            onPressEnter={(e) => {
              e.preventDefault();
              addItemButton.current.click();
            }}
          />
        </Col>

        <Col span={2} className="is-flex  add-button-height">
          <input
            type="button"
            ref={addItemButton}
            className="button is-primary "
            onClick={() => {
              setState((prevState) => ({
                ...prevState,
                [items_key]: [
                  {
                    ...item,
                    phone_details: [],
                    quantity:
                      !isEmpty(item.quantity) &&
                      validator.isNumeric(item.quantity.toString())
                        ? parseFloat(item.quantity)
                        : 0,
                    price:
                      !isEmpty(item.price) &&
                      validator.isNumeric(item.price.toString())
                        ? parseFloat(item.price)
                        : 0,
                  },
                  ...prevState[items_key],
                ],
              }));
              setItem(initialItemValues);
              stockField.current.focus();
            }}
            value="Add"
          />
        </Col>
      </Row>
    </div>
  );
}
