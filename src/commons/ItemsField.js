import { Col, Divider, message, Row } from "antd";

import React, { useEffect, useRef } from "react";
import validator from "validator";

import StockModalForm from "../components/modals/StockModalForm";

import {
  ACCESS_PRICE_CHANGE,
  CUSTOMER_PRICING_DEALER,
  DISCOUNT_PERCENT,
} from "../utils/constants";
import { discount_options } from "../utils/Options";
import round from "../utils/round";
import {
  onDepartmentSearch,
  onStockSearch,
  onUnitSearch,
} from "../utils/utilities";
import isEmpty from "../validation/is-empty";
import SelectFieldGroup from "./SelectFieldGroup";
import SimpleSelectFieldGroup from "./SimpleSelectFieldGroup";
import TextAreaGroup from "./TextAreaGroup";
import TextFieldGroup from "./TextFieldGroup";
import axios from "axios";
import moment from "moment";
import CheckboxFieldGroup from "./CheckboxFieldGroup";
import { hasAccess, onChange } from "../utils/form_utilities";
import UnitFormModal from "../components/modals/UnitFormModal";

export default function ItemsField({
  item,
  setItem,
  state = {},
  setState,
  items_key = "items",
  options,
  setOptions,
  errors,
  initialItemValues,
  has_discount = false,
  has_freight = false,
  has_open_quantity = true,
  has_unit = true,
  auth,
}) {
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);
  const discountTypeRef = useRef(null);
  const discountValueRef = useRef(null);
  const stockFormModal = useRef(null);
  const departmentsField = useRef(null);
  const freightField = useRef(null);
  const unitsField = useRef(null);
  const unitFormModal = useRef(null);
  const departmentFormModal = useRef(null);
  const remarksField = useRef(null);
  const unitOfMeasureRef = useRef(null);
  const associateUnitOfMeasureStockModalRef = useRef(null);

  useEffect(() => {
    const freight = parseFloat(
      (item.quantity || 0) * (item.freight_per_unit || 0)
    );

    //determine discount_amount
    const gross_amount = round(item.price * item.quantity + freight, 6);

    const discount_amount = round(gross_amount * (item.discount_rate / 100));

    const amount = round(
      parseFloat(gross_amount) -
        parseFloat(discount_amount) +
        parseFloat(item.freight || 0),
      2
    );

    setItem((prevState) => {
      return {
        ...prevState,
        amount,
        discount_amount,
        gross_amount,
        freight,
      };
    });

    return () => {};
  }, [
    item.quantity,
    item.price,
    item.discount_type,
    item.discount,
    item.discount_rate,
    item.freight_per_unit,
  ]);

  return (
    <div>
      <StockModalForm
        setField={(stock) => {
          setItem((prevState) => ({
            ...prevState,
            stock,
          }));
        }}
        ref={stockFormModal}
      />

      <Divider orientation="left" key="divider">
        Items
      </Divider>
      <Row key="form" className="ant-form-vertical" gutter="4">
        <Col span={8}>
          <SelectFieldGroup
            disabled={isEmpty(state.branch?._id)}
            inputRef={stockField}
            label="Item"
            value={item.stock?.name}
            onSearch={(value) => onStockSearch({ value, options, setOptions })}
            onChange={(index) => {
              const stock = options.stocks?.[index] || null;
              let price = 0;

              //get price of branc

              if (stock) {
                const branch_pricing =
                  stock.branch_pricing?.filter(
                    (o) => o?.branch?._id === state.branch?._id
                  )?.[0] || null;

                price = branch_pricing?.price || 0;

                if (state.account?.pricing_type === CUSTOMER_PRICING_DEALER) {
                  price = branch_pricing?.wholesale_price || 0;
                }
              }

              setItem({
                ...item,
                stock: options.stocks[index],
                price,
              });
              quanttiyField.current.focus();
            }}
            error={errors.stock?.name}
            formItemLayout={null}
            data={options.stocks}
            column="display_name"
            // onAddItem={() => stockFormModal.current.open()}
          />
        </Col>

        <Col span={2}>
          <TextFieldGroup
            type="number"
            step={0.01}
            label="Qty"
            value={item.quantity}
            onChange={(e) => {
              setItem({
                ...item,
                quantity: e.target.value,
                old_quantity: e.target.value,
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

        <Col span={2}>
          <TextFieldGroup
            disabled={
              !hasAccess({
                auth,
                access: ACCESS_PRICE_CHANGE,
                location,
              })
            }
            label="Price"
            value={item.price}
            onChange={(e) => {
              setItem({
                ...item,
                price: e.target.value,
              });
            }}
            error={errors.item && errors.item.price}
            formItemLayout={null}
            inputRef={priceField}
            onPressEnter={(e) => {
              e.preventDefault();
              if (has_freight) {
              } else {
                addItemButton.current.click();
              }
            }}
          />
        </Col>

        {has_discount && [
          <Col className="disc-rate" span={2}>
            <TextFieldGroup
              label="Disc Rate"
              onChange={(e) => {
                setItem({
                  ...item,
                  discount_rate: e.target.value,
                });
              }}
              value={item.discount_rate}
              formItemLayout={null}
            />
          </Col>,
          <Col key="disc-amount" span={2}>
            <TextFieldGroup
              label="Disc. Amount"
              value={item.discount_amount}
              readOnly
              formItemLayout={null}
            />
          </Col>,
        ]}

        {has_freight && [
          <Col className="disc-rate" span={2}>
            <TextFieldGroup
              label="Freight/Unit"
              onChange={(e) => {
                setItem({
                  ...item,
                  freight_per_unit: e.target.value,
                });
              }}
              inputRef={freightField}
              value={item.freight_per_unit}
              formItemLayout={null}
            />
          </Col>,
          <Col className="disc-rate" span={2}>
            <TextFieldGroup
              disabled
              readOnly
              label="Freight"
              value={item.freight}
              formItemLayout={null}
            />
          </Col>,
        ]}

        <Col span={2}>
          <TextFieldGroup
            label="Amount"
            value={item.amount}
            readOnly
            error={errors.item && errors.item.amount}
            formItemLayout={null}
          />
        </Col>
        {has_open_quantity && (
          <Col span={3} className="has-text-centered">
            <CheckboxFieldGroup
              label="Open Quantity"
              name="is_open_quantity"
              error={errors.is_open_quantity}
              checked={item.is_open_quantity}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.checked,
                  setState: setItem,
                });
              }}
            />
          </Col>
        )}

        <Col className="is-flex field-button-padding">
          <input
            type="button"
            ref={addItemButton}
            className="button is-primary is-small"
            onClick={() => {
              if (isEmpty(item.stock?._id)) {
                return message.error("Stock is required");
              }

              if (isEmpty(item.quantity)) {
                return message.error("Quantity is required");
              }

              setState((prevState) => ({
                ...prevState,
                [items_key]: [
                  ...prevState[items_key],
                  {
                    ...item,
                    quantity: item.quantity,
                    price: item.price,
                  },
                ],
              }));
              setItem(initialItemValues);
              stockField.current.focus();
            }}
            value="Add Item"
          />
        </Col>
      </Row>
    </div>
  );
}
