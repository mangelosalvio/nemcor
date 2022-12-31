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
  Input,
  Row,
  Col,
  Checkbox,
} from "antd";

import { formItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onDeleteItem,
  onChange,
  onUpdateStatus,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";

import {
  onCustomerSearch,
  addKeysToArray,
  onBankSearch,
  onCompanySearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { payment_type_options } from "../../utils/Options";
import { sumBy } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import {
  CANCELLED,
  OPEN,
  PAYMENT_TYPE_CHECK,
  PAYMENT_TYPE_TELEGRAPHIC_TRANSFER,
  SENIOR_DISC_VAT_EXEMPTED_AND_20_PERCENT,
  STATUS_CLOSED,
} from "../../utils/constants";
import { Link } from "react-router-dom";
import FormButtons from "../../commons/FormButtons";
import classNames from "classnames";
import BankFormModal from "../modals/BankFormModal";
import { onSupplierSearch } from "../utils/utilities";

const { Content } = Layout;

const url = "/api/check-vouchers/";
const title = "Check Voucher";

const initialValues = {
  _id: null,
  collection_no: null,
  date: moment(),
  customer: null,

  payment_type: null,
  bank: "",
  account_name: "",
  check_date: null,
  check_no: "",
  payment_amount: null,

  remarks: "",
  items: [],
  purchase_order_items: [],
  debit_memo_items: [],

  check_status: undefined,
  opening_balance: 0,
};

const initialItemValues = {};

const date_fields = ["date", "check_date", "transfer_date"];

const transaction_counter = {
  label: "Col #",
  key: "collection_no",
};

export default function CheckVoucherForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [page_size, setPageSize] = useState(10);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [options, setOptions] = useState({
    customers: [],
    stocks: [],
    warehouses: [],
  });
  const [search_state, setSearchState] = useState({});
  const [loading, setLoading] = useState(false);

  const [state, setState] = useState(initialValues);

  const customerFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const bankFormModal = useRef(null);

  const records_column = [
    {
      title: "CV #",
      dataIndex: "cv_no",
    },
    {
      title: "Company",
      dataIndex: ["company", "name"],
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Supplier",
      dataIndex: ["supplier", "name"],
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
    },

    {
      title: "Payment Type",
      dataIndex: "payment_type",
      align: "center",
    },

    {
      title: "Total Payment Amount",
      dataIndex: "total_payment_amount",
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Check Status",
      dataIndex: ["check_status", "status"],
      align: "center",
    },
    /* {
      title: "Log",
      dataIndex: "logs",
      render: (logs) => (
        <span className="log-desc">
          {!isEmpty(logs) && logs[logs.length - 1].log}
        </span>
      ),
    }, */
    {
      title: "Status",
      dataIndex: ["status"],
      align: "center",
      render: (status, record, index) => {
        return (
          <span
            className={classNames("has-text-weight-bold", {
              "has-text-danger": status?.approval_status === CANCELLED,
            })}
          >
            {status?.approval_status || ""}
          </span>
        );
      },
    },
  ];

  const purchase_order_column = [
    {
      title: "PO#",
      dataIndex: "po_no",
      width: 80,
    },
    {
      title: "SO#",
      dataIndex: "external_so_no",
      width: 80,
    },
    {
      title: "EXT PO#",
      dataIndex: "external_po_no",
      width: 80,
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date, record) =>
        record.footer !== 1 && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      width: 150,
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Remaining Balance",
      dataIndex: "balance",
      width: 150,
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },

    {
      title: "Payment Amount",
      dataIndex: "payment_amount",
      align: "right",
      width: 150,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 ? (
            <Input
              className="has-text-right"
              value={value}
              onChange={(e) => {
                const purchase_order_items = [...state.purchase_order_items];
                purchase_order_items[index] = {
                  ...purchase_order_items[index],
                  payment_amount: e.target.value,
                };

                setState((prevState) => ({
                  ...prevState,
                  purchase_order_items,
                }));
              }}
            />
          ) : (
            numberFormat(value)
          )}
        </span>
      ),
    },

    {
      title: "Balance after Payment",
      dataIndex: "payment_amount",
      width: 150,
      align: "right",
      render: (payment_amount, record) => (
        <span>
          {numberFormat(round(record.balance) - round(payment_amount || 0))}
        </span>
      ),
    },

    {
      title: "",
      width: 50,
      render: (value, record, index) =>
        record.footer !== 1 && (
          <Checkbox
            onChange={(e) => {
              const checked = e.target.checked;
              let _purchase_order_items;
              if (checked) {
                _purchase_order_items = [...state.purchase_order_items];
                _purchase_order_items[index] = {
                  ..._purchase_order_items[index],
                  payment_amount: round(_purchase_order_items[index].balance),
                };
              } else {
                _purchase_order_items = [...state.purchase_order_items];
                _purchase_order_items[index] = {
                  ..._purchase_order_items[index],
                  payment_amount: "",
                };
              }
              setState((prevState) => {
                return {
                  ...prevState,
                  purchase_order_items: _purchase_order_items,
                };
              });
            }}
          />
        ),
      align: "center",
    },

    {
      title: "",
      key: "action",
      width: 50,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) &&
            isEmpty(state.deleted) &&
            record.footer !== 1 && (
              <DeleteOutlined
                onClick={() =>
                  onDeleteItem({
                    field: "purchase_order_items",
                    index,
                    setState,
                  })
                }
              />
            )}
        </span>
      ),
    },
  ];

  const debit_memo_column = [
    {
      title: "DM #",
      dataIndex: "dm_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date, record) =>
        record.footer !== 1 && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount",
      width: 150,
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Remaining DM Balance",
      dataIndex: "balance",
      width: 150,
      align: "right",
      render: (value) => <span>{value && numberFormat(value)}</span>,
    },
    {
      title: "DM Amount",
      dataIndex: "debit_amount",
      align: "right",
      width: 150,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 ? (
            <Input
              className="has-text-right"
              type="number"
              value={value}
              onChange={(e) => {
                const debit_memo_items = [...state.debit_memo_items];
                debit_memo_items[index] = {
                  ...debit_memo_items[index],
                  debit_amount: parseFloat(e.target.value),
                };

                setState((prevState) => ({
                  ...prevState,
                  debit_memo_items,
                }));
              }}
            />
          ) : (
            numberFormat(value)
          )}
        </span>
      ),
    },

    {
      title: "Unused DM after Payment",
      dataIndex: "debit_amount",
      width: 150,
      align: "right",
      render: (debit_amount, record) => (
        <span>{numberFormat(record.balance - (debit_amount || 0))}</span>
      ),
    },

    {
      title: "",
      width: 50,
      render: (value, record, index) =>
        record.footer !== 1 && (
          <Checkbox
            onChange={(e) => {
              const checked = e.target.checked;
              let _debit_memo_items;
              if (checked) {
                _debit_memo_items = [...state.debit_memo_items];
                _debit_memo_items[index] = {
                  ..._debit_memo_items[index],
                  debit_amount: _debit_memo_items[index].balance,
                };
              } else {
                _debit_memo_items = [...state.debit_memo_items];
                _debit_memo_items[index] = {
                  ..._debit_memo_items[index],
                  debit_amount: "",
                };
              }
              setState((prevState) => {
                return {
                  ...prevState,
                  debit_memo_items: _debit_memo_items,
                };
              });
            }}
          />
        ),
      align: "center",
    },

    {
      title: "",
      key: "action",
      width: 50,
      align: "center",
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) &&
            isEmpty(state.deleted) &&
            record.footer !== 1 && (
              <DeleteOutlined
                onClick={() =>
                  onDeleteItem({
                    field: "debit_memo_items",
                    index,
                    setState,
                  })
                }
              />
            )}
        </span>
      ),
    },
  ];

  const onChangeSupplier = (supplier, department) => {
    const trans_loading = message.loading("Loading Accounts...");

    axios
      .post("/api/purchase-orders/supplier-accounts", {
        supplier,
        // company,
      })
      .then((response) => {
        trans_loading();
        if (response.data) {
          setState((prevState) => {
            return {
              ...prevState,
              purchase_order_items: [...(response.data.purchase_orders || [])],
              debit_memo_items: [...(response.data.debit_memos || [])],
            };
          });
        }
      })
      .catch((err) => {
        trans_loading();
        message.error("There was a problem processing your transaction.");
      });

    /* const cm_loading = message.loading("Loading Credit Memos...");
    axios
      .post(`/api/customer-collections/credit-memos`, { customer })
      .then((response) => {
        cm_loading();
        if (response.data) {
          setState((prevState) => ({
            ...prevState,
            debit_memo_items: [...response.data],
          }));
        }
      })
      .catch((err) => {
        cm_loading();
      }); */
  };

  useEffect(() => {
    const department = auth?.user?.department;
    setSearchState((prevState) => {
      return {
        ...prevState,
        user_department: department,
      };
    });

    return () => {};
  }, [auth.user]);

  useEffect(() => {
    setState((prevState) => {
      const total_balance = round(
        sumBy(state.purchase_order_items, (o) => round(o.balance))
      );

      const total_payment_amount = round(
        sumBy(state.purchase_order_items, (o) => round(o.payment_amount || 0))
      );

      const total_adjustment_amount = round(
        sumBy(state.purchase_order_items, (o) =>
          round(o.adjustment_amount || 0)
        )
      );

      const total_debit_amount = round(
        sumBy(state.debit_memo_items, (o) => round(o.debit_amount || 0))
      );

      const expected_payment_amount = round(
        total_payment_amount +
          total_adjustment_amount -
          (total_debit_amount || 0) +
          ((state.additional_rate || 0) / 100) * total_payment_amount -
          ((state.deduct_rate || 0) / 100) * total_payment_amount +
          round(state.additional_value || 0) -
          round(state.deduct_value || 0)
      );

      return {
        ...prevState,
        /* total_debit_amount: sumBy(state.items, (o) => o.total_debit_amount),
        net_amount: sumBy(state.items, (o) => o.net_amount), */
        total_payment_amount,
        total_debit_amount,
        total_balance,
        /* customer_credits, */
        expected_payment_amount,
      };
    });

    return () => {};
  }, [
    state.purchase_order_items,
    state.debit_memo_items,
    state.deduct_rate,
    state.deduct_value,
    state.additional_rate_remarks,
    state.additional_value,
  ]);

  const can_edit =
    (isEmpty(state.status) || [OPEN].includes(state.status?.approval_status)) &&
    isEmpty(state.deleted);

  return (
    <Content className="content-padding">
      <BankFormModal
        setField={({ bank }) => {
          setState((prevState) => ({
            ...prevState,
            bank,
          }));
        }}
        ref={bankFormModal}
      />

      <WarehouseFormModal
        setField={(warehouse) => {
          setState((prevState) => ({
            ...prevState,
            warehouse,
          }));
        }}
        ref={warehouseFormModal}
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
                page_size,
                search_keyword,
                url,
                setRecords,
                setTotalRecords,
                setCurrentPage,
                setErrors,
                advance_search: { ...search_state },
              });
            }}
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setState(initialValues);
              setItem(initialItemValues);
              setRecords([]);
            }}
          />
        </div>
      </div>

      <div className="logo-bg" style={{ background: "#fff", padding: 24 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={(values) => {
              //double check that total payment amount is equals total amount

              const payment_amount = round(state.payment_amount);

              const expected_payment_amount = round(
                state.expected_payment_amount
              );
              if (payment_amount !== expected_payment_amount) {
                console.log(expected_payment_amount, payment_amount);
                return message.error(
                  "There is inconsistency in your payment amount. Plesae check values"
                );
              }

              onSubmit({
                values: {
                  ...state,
                  purchase_order_items: state.purchase_order_items.filter(
                    (o) => round(o.payment_amount) !== 0
                  ),
                  debit_memo_items: state.debit_memo_items.filter(
                    (o) => round(o.debit_amount) !== 0
                  ),
                },
                auth,
                url,
                setErrors,
                setState,
                date_fields,
              });
            }}
            initialValues={initialValues}
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
              label="Company"
              value={state.company?.name}
              onSearch={(value) =>
                onCompanySearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const company = options.companies?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  company,
                }));
              }}
              error={errors.company}
              formItemLayout={formItemLayout}
              data={options.companies}
              column="name"
            />

            <SelectFieldGroup
              label="Supplier"
              value={state.supplier?.name}
              onSearch={(value) =>
                onSupplierSearch({ value, options, setOptions })
              }
              disabled={!isEmpty(state._id)}
              onChange={(index) => {
                const supplier = options.suppliers?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  supplier,
                }));
                onChangeSupplier(supplier, auth.user?.department);
              }}
              error={errors.supplier}
              formItemLayout={formItemLayout}
              data={options.suppliers}
              column="name"
            />

            <TextFieldGroup
              disabled
              label="Total PO Payment"
              name="total_payment_amount"
              value={state.total_payment_amount}
              error={errors.total_payment_amount}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              formItemLayout={formItemLayout}
            />
            <TextFieldGroup
              disabled
              label="Less: Debit Amount"
              name="total_debit_amount"
              value={state.total_debit_amount}
              error={errors.total_debit_amount}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              formItemLayout={formItemLayout}
            />

            <Row>
              <Col offset={3} span={11}>
                <Row gutter={4}>
                  <Col span={3}></Col>
                  <Col span={5}></Col>
                  <Col span={16}>Reason</Col>
                </Row>
                <Row gutter={4} className="ant-form-item">
                  <Col span={3} className="ant-form-item-label has-text-right">
                    <label>Add %</label>
                  </Col>
                  <Col span={5}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="additional_rate"
                      value={state.additional_rate}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                      type="number"
                      step="0.01"
                    />
                  </Col>
                  <Col span={16}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="additional_rate_remarks"
                      value={state.additional_rate_remarks}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                    />
                  </Col>
                </Row>
                <Row gutter={4} className="ant-form-item">
                  <Col span={3} className="ant-form-item-label has-text-right">
                    <label>₱</label>
                  </Col>
                  <Col span={5}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="additional_value"
                      value={state.additional_value}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                      type="number"
                      step="0.01"
                    />
                  </Col>
                  <Col span={16}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="additional_value_remarks"
                      value={state.additional_value_remarks}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                    />
                  </Col>
                </Row>

                {/* less */}

                <Row gutter={4}>
                  <Col span={3}></Col>
                  <Col span={5}></Col>
                  <Col span={16}>Reason</Col>
                </Row>
                <Row gutter={4} className="ant-form-item">
                  <Col span={3} className="ant-form-item-label has-text-right">
                    <label>Less %</label>
                  </Col>
                  <Col span={5}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="deduct_rate"
                      value={state.deduct_rate}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                      type="number"
                      step="0.01"
                    />
                  </Col>
                  <Col span={16}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="deduct_rate_remarks"
                      value={state.deduct_rate_remarks}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                    />
                  </Col>
                </Row>
                <Row gutter={4} className="ant-form-item">
                  <Col span={3} className="ant-form-item-label has-text-right">
                    <label>₱</label>
                  </Col>
                  <Col span={5}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="deduct_value"
                      value={state.deduct_value}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                      type="number"
                      step="0.01"
                    />
                  </Col>
                  <Col span={16}>
                    <Input
                      disabled={state.status?.approval_status === STATUS_CLOSED}
                      name="deduct_value_remarks"
                      value={state.deduct_value_remarks}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>

            <SimpleSelectFieldGroup
              label="Payment Type"
              name="payment_type"
              value={state.payment_type}
              onChange={(value) =>
                setState((prevState) => ({
                  ...prevState,
                  payment_type: value,
                }))
              }
              error={errors.payment_type}
              formItemLayout={formItemLayout}
              options={payment_type_options}
            />
            {state.payment_type === PAYMENT_TYPE_TELEGRAPHIC_TRANSFER && (
              <div>
                <Divider orientation="left" key="label">
                  TT Details
                </Divider>
                <SelectFieldGroup
                  label="Bank"
                  value={state.bank?.name}
                  onSearch={(value) => onBankSearch({ value, setOptions })}
                  onChange={(index) => {
                    const bank = options.banks[index];
                    setState((prevState) => ({
                      ...prevState,
                      bank,
                    }));
                  }}
                  error={errors.customer}
                  formItemLayout={formItemLayout}
                  data={options.banks}
                  column="name"
                  // help="BANK/ACCOUNT NAME ; E.G. BDO/HENGJI COMMERCIAL"
                  onAddItem={() => {
                    bankFormModal.current.open();
                  }}
                />
                <DatePickerFieldGroup
                  label="Transfer Date"
                  name="transfer_date"
                  value={state.transfer_date}
                  onChange={(value) => {
                    onChange({
                      key: "transfer_date",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.transfer_date}
                  formItemLayout={formItemLayout}
                />
              </div>
            )}

            {state.payment_type === PAYMENT_TYPE_CHECK && [
              <Divider orientation="left" key="label">
                Check Details
              </Divider>,
              <SelectFieldGroup
                key="bank"
                label="Bank"
                value={state.bank?.name}
                onSearch={(value) => onBankSearch({ value, setOptions })}
                onChange={(index) => {
                  const bank = options.banks[index];
                  setState((prevState) => ({
                    ...prevState,
                    bank,
                  }));
                }}
                error={errors.customer}
                formItemLayout={formItemLayout}
                data={options.banks}
                column="name"
                // help="BANK/ACCOUNT NAME ; E.G. BDO/HENGJI COMMERCIAL"
                onAddItem={() => {
                  bankFormModal.current.open();
                }}
              />,
              <TextFieldGroup
                key="account_name"
                label="Account"
                name="account_name"
                value={state.account_name}
                error={errors.account_name}
                onChange={(e) => {
                  onChange({
                    key: e.target.name,
                    value: e.target.value,
                    setState,
                  });
                }}
                formItemLayout={formItemLayout}
              />,

              <DatePickerFieldGroup
                key="check_date"
                label="Check Date"
                name="check_date"
                value={state.check_date}
                onChange={(value) => {
                  onChange({
                    key: "check_date",
                    value: value,
                    setState,
                  });
                }}
                error={errors.check_date}
                formItemLayout={formItemLayout}
              />,
              <TextFieldGroup
                key="check_no"
                label="Check No"
                name="check_no"
                value={state.check_no}
                error={errors.check_no}
                onChange={(e) => {
                  onChange({
                    key: e.target.name,
                    value: e.target.value,
                    setState,
                  });
                }}
                formItemLayout={formItemLayout}
              />,
            ]}

            <TextFieldGroup
              label="Amount"
              name="payment_amount"
              value={state.payment_amount}
              error={errors.payment_amount}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
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

            <TextFieldGroup
              label="Exp. Payment Amount"
              name="expected_payment_amount"
              value={state.expected_payment_amount}
              readOnly={true}
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

            <Divider orientation="left">Purchase Orders</Divider>

            <Table
              dataSource={addKeysToArray([
                ...state.purchase_order_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.purchase_order_items, (o) =>
                    round(o.total_amount)
                  ),

                  balance: sumBy(state.purchase_order_items, (o) =>
                    round(o.balance)
                  ),

                  payment_amount: sumBy(state.purchase_order_items, (o) =>
                    round(o.payment_amount)
                  ),
                  adjustment_amount: sumBy(state.purchase_order_items, (o) =>
                    round(o.adjustment_amount)
                  ),
                },
              ])}
              columns={purchase_order_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />

            <Divider orientation="left">Debit Memo</Divider>

            <Table
              dataSource={addKeysToArray([
                ...state.debit_memo_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.debit_memo_items, (o) =>
                    round(o.total_amount)
                  ),

                  balance: sumBy(state.debit_memo_items, (o) =>
                    round(o.balance)
                  ),

                  debit_amount: sumBy(state.debit_memo_items, (o) =>
                    round(o.debit_amount)
                  ),
                },
              ])}
              columns={debit_memo_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />

            {/* <Divider orientation="left">Credit Memo</Divider>

            <Table
              dataSource={addKeysToArray([
                ...state.debit_memo_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.debit_memo_items, (o) =>
                    round(o.total_amount)
                  ),

                  credit_memo_amount: sumBy(state.debit_memo_items, (o) =>
                    round(o.credit_memo_amount)
                  ),
                },
              ])}
              columns={debit_memo_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            /> */}

            <FormButtons
              state={state}
              auth={auth}
              loading={loading}
              url={url}
              initialValues={initialValues}
              initialItemValues={initialItemValues}
              setState={setState}
              setItem={setItem}
              onDelete={() => {
                onDelete({
                  id: state._id,
                  url,
                  user: auth.user,
                  cb: () => {
                    onSearch({
                      page: current_page,
                      page_size,
                      search_keyword,
                      url,
                      setRecords,
                      setTotalRecords,
                      setCurrentPage,
                      setErrors,
                      advance_search: { ...search_state },
                    });
                  },
                });
              }}
              onSearch={() => {
                onSearch({
                  page: current_page,
                  page_size,
                  search_keyword,
                  url,
                  setRecords,
                  setTotalRecords,
                  setCurrentPage,
                  setErrors,
                  advance_search: { ...search_state },
                });
              }}
              onClose={() => {
                onUpdateStatus({
                  url,
                  state,
                  approval_status: STATUS_CLOSED,
                  user: auth.user,
                  cb: () => {
                    edit({
                      record: state,
                      setState,
                      setErrors,
                      setRecords,
                      url,
                      date_fields,
                    });
                  },
                });
              }}
              has_print={!isEmpty(state._id)}
              has_cancel={!isEmpty(state._id)}
              onPrint={() => {
                window.open(`/print/sales-orders/${state._id}`, "_tab");
              }}
              has_save={can_edit}
            />
          </Form>
        ) : (
          <Table
            dataSource={addKeysToArray(records)}
            columns={records_column}
            rowKey={(record) => record._id}
            onRow={(record, index) => {
              return {
                onDoubleClick: (e) => {
                  edit({
                    record,
                    setState,
                    setErrors,
                    setRecords,
                    url,
                    date_fields,
                  });
                },
              };
            }}
            pagination={{
              current: current_page,
              defaultCurrent: current_page,
              onChange: (page, page_size) => {
                setPageSize(page_size);
                onSearch({
                  page,
                  page_size,
                  search_keyword,
                  url,
                  setRecords,
                  setTotalRecords,
                  setCurrentPage,
                  setErrors,
                  advance_search: { ...search_state },
                });
              },
              total: total_records,
              pageSize: 10,
            }}
          />
        )}
      </div>
    </Content>
  );
}
