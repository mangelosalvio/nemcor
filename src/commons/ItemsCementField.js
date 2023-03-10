import { Col, Divider, message, Row } from "antd";

import React, { useEffect, useRef } from "react";
import validator from "validator";

import StockModalForm from "../components/modals/StockModalForm";

import { DISCOUNT_PERCENT } from "../utils/constants";
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
import { onChange } from "../utils/form_utilities";
import UnitFormModal from "../components/modals/UnitFormModal";

export default function ItemsCementField({
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
    const uom_packaging = item.unit_of_measure?.packaging || 1;

    const freight = parseFloat(
      (item.quantity || 0) * uom_packaging * (item.freight_per_unit || 0)
    );

    //determine discount_amount
    const gross_amount = round(
      item.price * item.quantity * uom_packaging + freight
    );

    const discount_amount = round(gross_amount * (item.discount_rate / 100));

    const amount = round(
      parseFloat(gross_amount) - parseFloat(discount_amount)
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
    item.stock,
    item.quantity,
    item.price,
    item.discount_type,
    item.discount,
    item.discount_rate,
    item.freight_per_unit,
    item.unit_of_measure,
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
      <UnitFormModal
        setField={({ unit }) => {
          setItem((prevState) => ({
            ...prevState,
            unit,
          }));
        }}
        ref={unitFormModal}
      />

      <Divider orientation="left" key="divider">
        Items
      </Divider>
      <Row key="form" className="ant-form-vertical" gutter="4">
        <Col span={5}>
          <SelectFieldGroup
            key="1"
            inputRef={stockField}
            label="Item"
            value={item.stock?.name}
            onSearch={(value) => onStockSearch({ value, options, setOptions })}
            onChange={(index) => {
              const stock = options.stocks?.[index] || null;
              let unit_of_measure = null;
              if (stock) {
                unit_of_measure =
                  stock.unit_of_measures.filter((o) => o.is_default)?.[0] ||
                  null;
              }

              setItem({
                ...item,
                stock: options.stocks[index],
                unit_of_measure,
                discount_rate: state?.supplier?.discount_rate || 0,
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
              unitOfMeasureRef.current.focus();
              //addItemButton.current.click();
            }}
          />
        </Col>
        <Col span={4}>
          <SelectFieldGroup
            label="UOM"
            inputRef={unitOfMeasureRef}
            value={item.unit_of_measure?.unit}
            onChange={(index) => {
              const unit_of_measure = item.stock?.unit_of_measures?.[index];

              setItem((prevState) => ({
                ...prevState,
                unit_of_measure,
              }));
            }}
            error={errors.unit_of_measure}
            formItemLayout={null}
            data={item.stock?.unit_of_measures || []}
            column="unit"
            onAddItem={
              !isEmpty(item.stock)
                ? () => {
                    associateUnitOfMeasureStockModalRef.current.open(
                      item.stock
                    );
                  }
                : null
            }
          />
        </Col>

        <Col span={2}>
          <TextFieldGroup
            label="Price/Bag"
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
              label="Freight/Bag"
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

        {has_unit && (
          <Col span={3}>
            <SelectFieldGroup
              disabled={isEmpty(state.customer)}
              label="Unit"
              inputRef={unitsField}
              value={item.unit?.name}
              onSearch={(value) =>
                onUnitSearch({
                  value,
                  customer: state.customer,
                  options,
                  setOptions,
                })
              }
              onChange={(index) => {
                const unit = options.units[index];
                setItem((prevState) => ({
                  ...prevState,
                  unit,
                }));
              }}
              error={errors.unit}
              formItemLayout={null}
              data={options.units}
              column="name"
              onAddItem={() =>
                unitFormModal.current.open({ customer: state.customer })
              }
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
                return message.error("Quanttiy is required");
              }
              if (isEmpty(item.unit_of_measure?._id)) {
                return message.error("UOM is required");
              }

              setState((prevState) => ({
                ...prevState,
                [items_key]: [
                  ...prevState[items_key],
                  {
                    ...item,
                    quantity:
                      !isEmpty(item.quantity) &&
                      validator.isNumeric(item.quantity.toString())
                        ? parseFloat(item.quantity)
                        : 0,
                    old_quantity:
                      !isEmpty(item.old_quantity) &&
                      validator.isNumeric(item.old_quantity.toString())
                        ? parseFloat(item.old_quantity)
                        : 0,
                    price:
                      !isEmpty(item.price) &&
                      validator.isNumeric(item.price.toString())
                        ? parseFloat(item.price)
                        : 0,
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
