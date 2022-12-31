import React, { useState, useImperativeHandle, useRef } from "react";
import { Modal, Form, Table, Input, Button, message } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";
import numberFormat from "../../utils/numberFormat";
import { isEmpty, sumBy } from "lodash";
import round from "../../utils/round";
import axios from "axios";

const url = "/api/suppliers/";
const title = "Split Bundle";

const initialValues = {
  name: "",
  address: "",
  owner: "",
  contact_no: "",
  terms: "",
};
const SelectOrderModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [items, setItems] = useState([{}, {}]);
  const [index, setIndex] = useState(null);
  const inputRef = useRef(null);

  useImperativeHandle(
    ref,
    () => {
      return {
        open: () => {
          setItems([{}, {}]);
          setVisible(true);
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 300);
        },
      };
    },
    []
  );

  return (
    <div>
      <Modal
        title="Enter Queue #"
        visible={visible}
        onCancel={() => setVisible(false)}
        width={600}
        footer={false}
      >
        <div>
          <Input
            ref={inputRef}
            onPressEnter={(e) => {
              const target = e.target;
              const value = target.value;
              if (isEmpty(value)) {
                return message.error("Queue # cannot be empty");
              }
              axios
                .get(`/api/sales/${value}/sales-order`)
                .then((response) => {
                  if (response.data) {
                    props.onSelectOrder(response.data);
                    target.value = "";
                    setVisible(false);
                  } else {
                    return message.error("No Sales Order with QUEUE # found");
                  }
                })
                .catch((err) => {
                  console.log(err);
                });
            }}
          />
        </div>
      </Modal>
    </div>
  );
});

export default SelectOrderModal;
