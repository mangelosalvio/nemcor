import React, { useState, useImperativeHandle } from "react";
import { Modal, Form } from "antd";
import { forwardRef } from "react";

import { useSelector } from "react-redux";
import { formItemLayout, tailFormItemLayout } from "../../utils/Layouts";
import { onSubmitModal, onChange } from "../../utils/form_utilities";
import TextFieldGroup from "../../commons/TextFieldGroup";

const url = "/api/areas/";
const title = "Area Form";

const initialValues = {
  name: "",
};
const AreaModal = forwardRef((props, ref) => {
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
              label="Area"
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

export default AreaModal;
