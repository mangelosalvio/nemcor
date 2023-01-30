import { Form, Modal } from "antd";

import React, { useCallback } from "react";
import { useLocation } from "react-router-dom";
const { confirm } = Modal;

import {
  OPEN,
  APPROVED_FOR_QUOTE,
  CLOSE_QUOTE,
  FOR_TRANSFER,
  RECEIVED,
  PRINT,
  PROCESSED,
  ADJUSTMENT,
  PO_STATUS_ALLOWED_EDIT,
  APPROVED_FOR_PRINTING,
  FOR_APPROVAL,
  STATUS_CLOSED,
  CANCELLED,
  STATUS_PAID,
  ACCESS_CANCEL,
  ACCESS_APPROVE,
  ACCESS_PRINT,
  ACCESS_ADD,
  ACCESS_UPDATE,
} from "../utils/constants";
import { hasAccess } from "../utils/form_utilities";

import isEmpty from "../validation/is-empty";

export default function FormButtons({
  state,
  auth,
  loading,
  onClose,
  url,
  onDelete,
  initialValues,
  initialItemValues,
  setState,
  setItem,
  onFinalize,
  additional_buttons = [],
  onEdit = null,
  has_approve = true,
  is_termination = false,
  has_print = true,
  has_cancel = true,
  onSearch,
  has_save = true,
  setIsNext,
  has_next = false,
  save_statuses = [],
  onPrint,
  finalize_label,
}) {
  const location = useLocation();

  return (
    <Form.Item className="m-t-1">
      <div className="field is-grouped">
        {([OPEN, ...save_statuses].includes(state.status?.approval_status) ||
          isEmpty(state.status?.approval_status)) &&
          has_save &&
          ((isEmpty(state._id) &&
            hasAccess({
              auth,
              access: ACCESS_ADD,
              location,
            })) ||
            (!isEmpty(state._id) &&
              hasAccess({
                auth,
                access: ACCESS_UPDATE,
                location,
              }))) && (
            <div className="control">
              <button className="button is-primary" disabled={loading}>
                Save
              </button>
            </div>
          )}

        {onFinalize && !isEmpty(state._id) && isEmpty(state.status) && (
          <span
            className="button is-info is-outlined  control"
            onClick={() => {
              onFinalize();
            }}
          >
            <span>{finalize_label}</span>
          </span>
        )}

        {has_print &&
          state.status?.approval_status !== CANCELLED &&
          hasAccess({
            auth,
            access: ACCESS_PRINT,
            location,
          }) && (
            <div className="control">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onPrint();
                }}
                className="button is-info is-outlined"
                disabled={loading}
              >
                <i className="fas fa-print pad-right-8" />
                Print
              </button>
            </div>
          )}
        {!isEmpty(state?._id) &&
          additional_buttons.map((Component) => Component)}

        {onClose &&
          !isEmpty(state?._id) &&
          [OPEN].includes(state.status?.approval_status) &&
          hasAccess({
            auth,
            access: ACCESS_APPROVE,
            location,
          }) && (
            <div className="control">
              <button
                className="button is-info"
                onClick={(e) => {
                  e.preventDefault();
                  confirm({
                    title: "Close Transaction",
                    content: "Would you like to confirm?",
                    okText: "Close",
                    cancelText: "No",
                    onOk: () => {
                      onClose();
                    },
                    onCancel: () => {},
                  });
                }}
              >
                <i className="fas fa-lock pad-right-8" />
                Close
              </button>
            </div>
          )}
        {has_cancel &&
          ![CANCELLED].includes(state.status?.approval_status) &&
          !isEmpty(state?._id) &&
          hasAccess({
            auth,
            access: ACCESS_CANCEL,
            location,
          }) && (
            <div className="control">
              <button
                className="button is-danger"
                onClick={(e) => {
                  e.preventDefault();
                  confirm({
                    title: "Cancel Transaction",
                    content: "Would you like to confirm?",
                    okText: "Cancel",
                    cancelText: "No",
                    onOk: () => {
                      onDelete();
                    },
                    onCancel: () => {},
                  });
                }}
              >
                <i className="fas fa-times pad-right-8" />
                Cancel
              </button>
            </div>
          )}
        <div className="control">
          <button
            className="button "
            onClick={(e) => {
              e.preventDefault();
              onSearch();
            }}
          >
            Exit
          </button>
        </div>
      </div>
    </Form.Item>
  );
}
