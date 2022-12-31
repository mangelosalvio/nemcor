import React, { useState, useImperativeHandle } from "react";
import { Modal, Form } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";
import { InfoCircleOutlined } from "@ant-design/icons";
import confirm from "antd/lib/modal/confirm";

const url = "/api/banks/";
const title = "Bank";

const initialValues = {
  name: "",
};
const BankFormModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  useImperativeHandle(
    ref,
    () => {
      return {
        open: () => {
          setState({ ...initialValues });
          setVisible(true);
        },
      };
    },
    []
  );

  return (
    <div>
      <Modal
        title={title}
        visible={visible}
        onOk={onSubmitModal}
        onCancel={() => setVisible(false)}
        width={800}
        centered={true}
        footer={false}
      >
        <div>
          <Form
            onFinish={(values) => {
              confirm({
                title: "Add Item Confirmation",
                icon: <InfoCircleOutlined />,
                content: "Would you like to confirm add the item?",
                onOk() {
                  onSubmitModal({
                    setField: (data) => {
                      props.setField({
                        bank: data,
                      });
                    },
                    setVisible,
                    values: state,
                    auth,
                    url,
                    setErrors,
                  });
                },
                onCancel() {},
              });
            }}
            initialValues={initialValues}
          >
            <TextFieldGroup
              label="Name"
              name="name"
              value={state.name}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              error={errors.name}
              autoComplete="off"
              formItemLayout={formItemLayout}
            />

            <Form.Item className="m-t-1" {...tailFormItemLayout}>
              <div className="field is-grouped">
                <div className="control">
                  <button className="button is-small is-primary">Save</button>
                </div>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
});

export default BankFormModal;
