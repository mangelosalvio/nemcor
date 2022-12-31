import React, { useState, useImperativeHandle } from "react";
import { Modal, Form } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";

const url = "/api/suppliers/";
const title = "Supplier Form";

const initialValues = {
  name: "",
  address: "",
  owner: "",
  contact_no: "",
  terms: "",
};
const SupplierFormModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  useImperativeHandle(
    ref,
    () => {
      return {
        open: () => {
          setState(initialValues);
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
            onFinish={(values) =>
              onSubmitModal({
                setField: props.setField,
                setVisible,
                values: state,
                auth,
                url,
                setErrors,
              })
            }
            initialValues={initialValues}
          >
            <TextFieldGroup
              label="Company Name"
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
            <TextFieldGroup
              label="Address"
              name="address"
              value={state.address}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              error={errors.address}
              formItemLayout={formItemLayout}
            />
            <TextFieldGroup
              label="Owner"
              name="owner"
              value={state.owner}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              error={errors.owner}
              formItemLayout={formItemLayout}
            />
            <TextFieldGroup
              label="Contact No."
              name="contact_no"
              value={state.contact_no}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              error={errors.contact_no}
              formItemLayout={formItemLayout}
            />
            <TextFieldGroup
              label="Terms"
              name="terms"
              value={state.terms}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              error={errors.terms}
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

export default SupplierFormModal;
