import React, { useState, useRef, useEffect } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  message,
  Row,
  Col,
  Input,
} from "antd";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  addNew,
  onSearch,
  onDeleteItem,
  onChange,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import SupplierFormModal from "../modals/SupplierFormModal";
import {
  onSupplierSearch,
  onStockSearch,
  addKeysToArray,
  onAccountSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import {
  PO_STATUS_PENDING,
  PO_STATUS_ACCOMPLISHED,
  PO_STATUS_CLOSED,
  APPROVED,
} from "../../utils/constants";
import { sumBy } from "lodash";
import { Link } from "react-router-dom";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";

const { Content } = Layout;

const url = "/api/account-adjustments/";
const title = "Account Adjustment Form";

const initialValues = {
  _id: null,
  account_adjustment_no: null,
  date: moment(),
  account: null,
  remarks: "",
  amount: "",
};

const date_fields = ["date"];
const transaction_counter = {
  label: "ACCT ADJ #",
  key: "account_adjustment_no",
};

export default function AccountAdjustmentForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);

  const [options, setOptions] = useState({
    accounts: [],
    stocks: [],
  });

  const [state, setState] = useState(initialValues);

  const supplierFormModal = useRef(null);

  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);

  const records_column = [
    {
      title: "ACCT ADJ #",
      dataIndex: "account_adjustment_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Account",
      dataIndex: ["account", "name"],
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right",
      width: 100,
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Log",
      dataIndex: "logs",
      render: (logs) => (
        <span className="log-desc">
          {!isEmpty(logs) && logs[logs.length - 1].log}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status, record, index) => {
        if (record.deleted && record.deleted.date) {
          return (
            <span className="has-text-danger has-text-weight-bold">VOIDED</span>
          );
        }

        return <span>{status && status.approval_status}</span>;
      },
    },
    {
      title: "",
      key: "action",
      width: 10,
      render: (text, record) => (
        <span
          onClick={() =>
            edit({
              record,
              setState,
              setErrors,
              setRecords,
              url,
              date_fields,
            })
          }
        >
          <i className="fas fa-edit"></i>
        </span>
      ),
    },
  ];

  return (
    <Content className="content-padding">
      <SupplierFormModal
        setField={(supplier) => {
          setState((prevState) => ({
            ...prevState,
            supplier,
          }));
        }}
        ref={supplierFormModal}
      />
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <div className="column">
          <Searchbar
            name="search_keyword"
            onSearch={(value, e) => {
              e.preventDefault();
              onSearch({
                page: 1,
                search_keyword,
                url,
                setRecords,
                setTotalRecords,
                setCurrentPage,
                setErrors,
              });
            }}
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setState(initialValues);
              setRecords([]);
            }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                values: state,
                auth,
                url,
                setErrors,
                setState,
                date_fields,
              });
            }}
          >
            {state[transaction_counter.key] && (
              <TextFieldGroup
                label={transaction_counter.label}
                value={state[transaction_counter.key]}
                error={errors.remarks}
                formItemLayout={formItemLayout}
                readOnly
              />
            )}
            <DatePickerFieldGroup
              label="Date"
              name="date"
              value={state.date}
              onChange={(value) => {
                onChange({
                  key: "date",
                  value: value,
                  setState,
                });
              }}
              error={errors.date}
              formItemLayout={formItemLayout}
            />

            <SelectFieldGroup
              label="Account"
              value={state.account?.name}
              onSearch={(value) =>
                onAccountSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const account = options.accounts[index];
                setState((prevState) => ({
                  ...prevState,
                  account,
                }));
              }}
              error={errors.account}
              formItemLayout={formItemLayout}
              data={options.accounts}
              column="name"
            />

            <TextFieldGroup
              type="number"
              label="Amount"
              name="amount"
              value={state?.amount}
              error={errors.amount}
              onChange={(e) => {
                const value = e.target.value;
                setState((prevState) => {
                  return {
                    ...prevState,
                    amount: value,
                  };
                });
              }}
              formItemLayout={formItemLayout}
            />

            <TextAreaGroup
              label="Remarks"
              name="remarks"
              value={state.remarks}
              error={errors.remarks}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              formItemLayout={formItemLayout}
            />

            {state.status && state.status.datetime && (
              <TextFieldGroup
                label="Status"
                name="status"
                value={`${state.status.approval_status} / ${
                  state.status.user.name
                } / ${moment(state.status.datetime).format("LLL")}`}
                formItemLayout={formItemLayout}
                readOnly
              />
            )}

            {state.deleted && state.deleted.date && (
              <TextFieldGroup
                label="Voided By"
                name="status"
                value={`${state.deleted?.user?.name} / ${moment(
                  state.deleted.date
                ).format("LLL")}`}
                formItemLayout={formItemLayout}
                readOnly
              />
            )}

            {isEmpty(state.deleted) && (
              <Form.Item className="m-t-1">
                <div className="field is-grouped">
                  {state.status?.approval_status !== APPROVED && (
                    <div className="control">
                      <button className="button is-small is-primary">
                        Save
                      </button>
                    </div>
                  )}

                  {!isEmpty(state._id) && (
                    <span
                      className="button is-danger is-outlined is-small"
                      onClick={() => {
                        onDelete({
                          id: state._id,
                          url,
                          user: auth.user,
                        });
                        setState(initialValues);
                      }}
                    >
                      <span>Delete</span>
                      <span className="icon is-small">
                        <i className="fas fa-times"></i>
                      </span>
                    </span>
                  )}
                </div>
              </Form.Item>
            )}
          </Form>
        ) : (
          <Table
            dataSource={addKeysToArray(records)}
            columns={records_column}
            rowKey={(record) => record._id}
            pagination={{
              current: current_page,
              defaultCurrent: current_page,
              onChange: (page) =>
                onSearch({
                  page,
                  search_keyword,
                  url,
                  setRecords,
                  setTotalRecords,
                  setCurrentPage,
                  setErrors,
                }),
              total: total_records,
              pageSize: 10,
            }}
          />
        )}
      </div>
    </Content>
  );
}
