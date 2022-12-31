import React, { useState, useImperativeHandle } from "react";
import { Modal, Form } from "antd";
import { forwardRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";

const url = "/api/categories/";
const title = "Category Form";
const initialValues = {
  name: "",
};

const CategoryFormModal = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState(initialValues);
  const auth = useSelector((state) => state.auth);

  useImperativeHandle(
    ref,
    () => {
      return {
        open: () => {
          setVisible(true);
        },
      };
    },
    []
  );

  return (
    <div>
      <Modal
        onCancel={() => {
          setVisible(false);
        }}
        title={title}
        visible={visible}
        centered={true}
        footer={false}
      >
        <div>
          <Form
            onFinish={() =>
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

export default CategoryFormModal;
