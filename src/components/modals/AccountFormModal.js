import React, { useState, useImperativeHandle } from "react";
import { Modal, Form } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import {
  account_type_options,
  customer_pricing_options,
} from "../../utils/Options";
import {
  ACCOUNT_TYPE_CONSIGNEE,
  ACCOUNT_TYPE_CUSTOMER,
} from "../../utils/constants";

const url = "/api/accounts/";
const title = "Account Form";

const initialValues = {
  name: "",
  address: "",
  owner: "",
  contact_no: "",
  terms: "",
};
const AccountFormModal = forwardRef((props, ref) => {
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
            <TextFieldGroup
              label="Address"
              name="address"
              error={errors.address}
              formItemLayout={formItemLayout}
              value={state.address}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <TextFieldGroup
              label="Contact No."
              name="contact_no"
              error={errors.contact_no}
              formItemLayout={formItemLayout}
              value={state.contact_no}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="Business Style"
              name="business_style"
              error={errors.business_style}
              formItemLayout={formItemLayout}
              value={state.business_style}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="TIN"
              name="tin"
              error={errors.tin}
              formItemLayout={formItemLayout}
              value={state.tin}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              type="number"
              step={1}
              label="Terms in Days"
              name="terms"
              error={errors.terms}
              formItemLayout={formItemLayout}
              value={state.terms}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <SimpleSelectFieldGroup
              label="Account Type"
              name="account_type"
              value={state.account_type}
              onChange={(value) => {
                onChange({
                  key: "account_type",
                  value: value,
                  setState,
                });
              }}
              error={errors?.account_type}
              formItemLayout={formItemLayout}
              options={account_type_options}
            />

            {[ACCOUNT_TYPE_CONSIGNEE, ACCOUNT_TYPE_CUSTOMER].includes(
              state.account_type
            ) && (
              <SimpleSelectFieldGroup
                label="Pricing Type"
                name="pricing_type"
                value={state.pricing_type}
                onChange={(value) => {
                  onChange({
                    key: "pricing_type",
                    value: value,
                    setState,
                  });
                }}
                error={errors?.pricing_type}
                formItemLayout={formItemLayout}
                options={customer_pricing_options}
              />
            )}

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

export default AccountFormModal;
