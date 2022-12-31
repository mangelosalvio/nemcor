import React, { useState, useImperativeHandle } from "react";
import { Modal, Form, Table, Input, Button, message } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";
import numberFormat from "../../utils/numberFormat";
import { isEmpty, sumBy } from "lodash";
import round from "../../utils/round";

const url = "/api/suppliers/";
const title = "Split Bundle";

const initialValues = {
  name: "",
  address: "",
  owner: "",
  contact_no: "",
  terms: "",
};
const SplitBundleModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [items, setItems] = useState([{}, {}]);
  const [index, setIndex] = useState(null);

  useImperativeHandle(
    ref,
    () => {
      return {
        open: ({ record, index }) => {
          setItems([{}, {}]);
          setState(record);
          setVisible(true);
          setIndex(index);
        },
      };
    },
    []
  );

  return (
    <div>
      <Modal
        title={`${state.quantity} - ${state.stock?.name}`}
        visible={visible}
        onOk={() => {
          const total_quantity = round(
            sumBy(items, (o) => parseFloat(o.quantity || 0))
          );

          const quantity = round(state.quantity);

          if (quantity !== total_quantity) {
            message.error(`Total Split quantity should be ${quantity}`);
            return;
          }

          let _items = [...items];
          const _state = state;
          delete _state?._id;
          _items = _items
            .filter((o) => !isEmpty(o.quantity))
            .map((o) => {
              const amount = round(o.quantity * _state.price);
              return {
                ..._state,
                ...o,
                amount,
              };
            });

          props.onSplit(_items, index);
          setVisible(false);
        }}
        okText="Split"
        onCancel={() => setVisible(false)}
        width={400}
        centered={true}
      >
        <div>
          {items.map((item, index) => (
            <div className="has-text-centered">
              <i
                className="fas fa-trash-alt pad-right-8"
                onClick={() => {
                  const _items = [...items];
                  _items.splice(index, 1);
                  setItems(_items);
                }}
              ></i>
              <Input
                type="number"
                step={1}
                className="m-t-1 input-price"
                value={item.quantity}
                onChange={(e) => {
                  const _items = [...items];
                  _items[index] = {
                    ...items[index],
                    quantity: e.target.value,
                  };

                  setItems(_items);
                }}
              />
            </div>
          ))}
          <div className="has-text-centered">
            <Button
              className="input-price m-t-1"
              onClick={() => {
                const _items = [...items, {}];
                setItems(_items);
              }}
            >
              Add{" "}
            </Button>
          </div>
          <div className="has-text-weight-bold b-t-3 m-t-1 has-text-centered">
            <Input
              disabled
              className="input-price m-t-1"
              value={numberFormat(
                sumBy(items, (o) => parseFloat(o.quantity || 0))
              )}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default SplitBundleModal;
