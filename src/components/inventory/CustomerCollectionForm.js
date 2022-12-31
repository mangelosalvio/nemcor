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
  Collapse,
  PageHeader,
  Button,
} from "antd";

import { formItemLayout, smallFormItemLayout } from "./../../utils/Layouts";
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
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/customer-collections/";
const title = "Collection Form";

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
  delivery_items: [],
  credit_memo_items: [],

  check_status: undefined,
  opening_balance: 0,
};

const initialItemValues = {};

const date_fields = ["date", "check_date", "transfer_date"];

const transaction_counter = {
  label: "Col #",
  key: "collection_no",
};

export default function CustomerCollectionForm() {
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
      title: "Coll #",
      dataIndex: "collection_no",
      width: 50,
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
      title: "Customer",
      dataIndex: ["customer", "name"],
    },
    {
      title: "DR#s",
      dataIndex: ["delivery_items"],
      render: (items) => items.map((o) => o.dr_no).join(", "),
    },
    {
      title: "CM#s",
      dataIndex: ["credit_memo_items"],
      render: (items) => items.map((o) => o.cm_no).join(", "),
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

  const deliveries_column = [
    {
      title: "DR#",
      dataIndex: "dr_no",
    },
    {
      title: "Ext DR#",
      dataIndex: "external_dr_ref",
      width: 80,
      align: "center",
    },
    {
      title: "SI#",
      dataIndex: "si_no",
      width: 80,
      align: "center",
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

    /* {
      title: "Adjustments",
      dataIndex: "adjustment_amount",
      align: "right",
      width: 150,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 ? (
            <Input
              type="number"
              step={0.01}
              className="has-text-right"
              value={value}
              onChange={(e) => {
                const delivery_items = [...state.delivery_items];
                delivery_items[index] = {
                  ...delivery_items[index],
                  adjustment_amount: e.target.value,
                };

                setState((prevState) => ({
                  ...prevState,
                  delivery_items,
                }));
              }}
            />
          ) : (
            numberFormat(value)
          )}
        </span>
      ),
    }, */
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
                const delivery_items = [...state.delivery_items];
                delivery_items[index] = {
                  ...delivery_items[index],
                  payment_amount: e.target.value,
                };

                setState((prevState) => ({
                  ...prevState,
                  delivery_items,
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
        <span>{numberFormat(record.balance - (payment_amount || 0))}</span>
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
              let _delivery_items;
              if (checked) {
                _delivery_items = [...state.delivery_items];
                _delivery_items[index] = {
                  ..._delivery_items[index],
                  payment_amount: _delivery_items[index].balance,
                };
              } else {
                _delivery_items = [...state.delivery_items];
                _delivery_items[index] = {
                  ..._delivery_items[index],
                  payment_amount: "",
                };
              }
              setState((prevState) => {
                return {
                  ...prevState,
                  delivery_items: _delivery_items,
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
      align: "center",
      width: 50,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) &&
            isEmpty(state.deleted) &&
            record.footer !== 1 && (
              <DeleteOutlined
                onClick={() =>
                  onDeleteItem({
                    field: "delivery_items",
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

  const credit_memo_column = [
    {
      title: "CM #",
      dataIndex: "cm_no",
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
      title: "Remaining CM Balance",
      dataIndex: "balance",
      width: 150,
      align: "right",
      render: (value) => <span>{value && numberFormat(value)}</span>,
    },
    {
      title: "CM Amount",
      dataIndex: "credit_amount",
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
                const credit_memo_items = [...state.credit_memo_items];
                credit_memo_items[index] = {
                  ...credit_memo_items[index],
                  credit_amount: parseFloat(e.target.value),
                };

                setState((prevState) => ({
                  ...prevState,
                  credit_memo_items,
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
      title: "Unused CM after Payment",
      dataIndex: "credit_amount",
      width: 150,
      align: "right",
      render: (credit_amount, record) => (
        <span>{numberFormat(record.balance - (credit_amount || 0))}</span>
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
              let _credit_memo_items;
              if (checked) {
                _credit_memo_items = [...state.credit_memo_items];
                _credit_memo_items[index] = {
                  ..._credit_memo_items[index],
                  credit_amount: _credit_memo_items[index].balance,
                };
              } else {
                _credit_memo_items = [...state.credit_memo_items];
                _credit_memo_items[index] = {
                  ..._credit_memo_items[index],
                  credit_amount: "",
                };
              }
              setState((prevState) => {
                return {
                  ...prevState,
                  credit_memo_items: _credit_memo_items,
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
                    field: "credit_memo_items",
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

  const onChangeCustomer = (customer) => {
    const dr_loading = message.loading("Loading Charge Sales...");

    axios
      .post("/api/delivery-receipts/customer-accounts", {
        customer: customer,
        department: auth.user?.department,
      })
      .then((response) => {
        dr_loading();
        if (response.data) {
          setState((prevState) => {
            return {
              ...prevState,
              delivery_items: [...(response.data.deliveries || [])],
              credit_memo_items: [...(response.data.credit_memos || [])],
            };
          });
        }
      })
      .catch((err) => {
        dr_loading();
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
            credit_memo_items: [...response.data],
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
        sumBy(state.delivery_items, (o) => round(o.balance))
      );

      const total_payment_amount = round(
        sumBy(state.delivery_items, (o) => round(o.payment_amount || 0))
      );

      const total_adjustment_amount = round(
        sumBy(state.delivery_items, (o) => round(o.adjustment_amount || 0))
      );

      const total_credit_amount = round(
        sumBy(state.credit_memo_items, (o) => round(o.credit_amount || 0))
      );

      const additional_rate_amount = round(
        ((state.additional_rate || 0) / 100) * total_payment_amount
      );

      const deduct_rate_amount = round(
        ((state.deduct_rate || 0) / 100) * total_payment_amount
      );

      const expected_payment_amount = round(
        total_payment_amount +
          total_adjustment_amount -
          (total_credit_amount || 0) +
          additional_rate_amount -
          deduct_rate_amount +
          round(state.additional_value || 0) -
          round(state.deduct_value || 0)
      );

      return {
        ...prevState,
        /* total_debit_amount: sumBy(state.items, (o) => o.total_debit_amount),
        net_amount: sumBy(state.items, (o) => o.net_amount), */
        total_payment_amount,
        total_credit_amount,
        total_balance,
        /* customer_credits, */
        expected_payment_amount,
        additional_rate_amount,
        deduct_rate_amount,
      };
    });

    return () => {};
  }, [
    state.delivery_items,
    state.credit_memo_items,
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

      <Col span={24} className="m-b-1">
        <Collapse>
          <Panel header="Advance Search" key="1">
            <PageHeader
              backIcon={false}
              style={{
                border: "1px solid rgb(235, 237, 240)",
              }}
              onBack={() => null}
              title="Advance Filter"
              subTitle="Enter appropriate data to filter records"
            >
              <div className="or-slip-form">
                <Row>
                  <Col span={8}>
                    <RangeDatePickerFieldGroup
                      label="Date"
                      name="period_covered"
                      value={search_state?.period_covered}
                      onChange={(dates) =>
                        setSearchState((prevState) => ({
                          ...prevState,
                          period_covered: dates,
                        }))
                      }
                      formItemLayout={smallFormItemLayout}
                    />
                  </Col>
                  <Col span={8}>
                    <SelectFieldGroup
                      label="Customer"
                      value={search_state?.customer?.name}
                      onSearch={(value) =>
                        onCustomerSearch({ value, options, setOptions })
                      }
                      onChange={(index) => {
                        const customer = options.customers?.[index] || null;
                        setSearchState((prevState) => ({
                          ...prevState,
                          customer,
                        }));
                      }}
                      formItemLayout={smallFormItemLayout}
                      data={options.customers}
                      column="name"
                    />
                  </Col>
                  <Col span={8}>
                    <TextFieldGroup
                      label="Col #"
                      name="collection_no"
                      formItemLayout={smallFormItemLayout}
                      value={search_state?.collection_no}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState: setSearchState,
                        });
                      }}
                    />
                  </Col>
                </Row>
                <Row>
                  <Col span={8}>
                    <SimpleSelectFieldGroup
                      label="Status"
                      name="approval_status"
                      value={search_state?.approval_status}
                      onChange={(value) => {
                        onChange({
                          key: "approval_status",
                          value: value,
                          setState: setSearchState,
                        });
                      }}
                      error={errors?.approval_status}
                      formItemLayout={smallFormItemLayout}
                      options={[OPEN, STATUS_CLOSED, CANCELLED] || []}
                    />
                  </Col>
                  <Col span={8}>
                    <TextFieldGroup
                      label="DR #"
                      name="dr_no"
                      formItemLayout={smallFormItemLayout}
                      value={search_state?.dr_no}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState: setSearchState,
                        });
                      }}
                    />
                  </Col>
                  <Col span={8}>
                    <TextFieldGroup
                      label="CM #"
                      name="cm_no"
                      formItemLayout={smallFormItemLayout}
                      value={search_state?.cm_no}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState: setSearchState,
                        });
                      }}
                    />
                  </Col>
                </Row>

                <Row>
                  <Col span={8}>
                    <Row>
                      <Col offset={8} span={12}>
                        <Button
                          type="info"
                          size="large"
                          icon={
                            <i className="fa-solid fa-magnifying-glass pad-right-8"></i>
                          }
                          onClick={() => {
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
                        >
                          Search
                        </Button>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={8}></Col>
                  <Col span={8}></Col>
                </Row>
              </div>
            </PageHeader>
          </Panel>
        </Collapse>
      </Col>

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
                  delivery_items: state.delivery_items.filter(
                    (o) => round(o.payment_amount) !== 0
                  ),
                  credit_memo_items: state.credit_memo_items.filter(
                    (o) => round(o.credit_amount) !== 0
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
              label="Customer"
              value={state.customer?.name}
              onSearch={(value) =>
                onCustomerSearch({ value, options, setOptions })
              }
              disabled={!isEmpty(state._id)}
              onChange={(index) => {
                const customer = options.customers[index];
                setState((prevState) => ({
                  ...prevState,
                  customer,
                }));
                onChangeCustomer(customer);
              }}
              error={errors.customer}
              formItemLayout={formItemLayout}
              data={options.customers}
              column="name"
            />

            <TextFieldGroup
              disabled
              label="Total DR Payment"
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
              label="Less: Credit Amount"
              name="total_credit_amount"
              value={state.total_credit_amount}
              error={errors.total_credit_amount}
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
                  help="BANK/ACCOUNT NAME ; E.G. BDO/HENGJI COMMERCIAL"
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

            <Divider orientation="left">Deliveries/Pickup</Divider>

            <Table
              dataSource={addKeysToArray([
                ...state.delivery_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.delivery_items, (o) =>
                    round(o.total_amount)
                  ),
                  total_returned_amount: sumBy(state.delivery_items, (o) =>
                    round(o.total_returned_amount)
                  ),
                  net_amount: sumBy(state.delivery_items, (o) =>
                    round(o.net_amount)
                  ),

                  balance: sumBy(state.delivery_items, (o) => round(o.balance)),

                  payment_amount: sumBy(state.delivery_items, (o) =>
                    round(o.payment_amount)
                  ),
                  adjustment_amount: sumBy(state.delivery_items, (o) =>
                    round(o.adjustment_amount)
                  ),
                },
              ])}
              columns={deliveries_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />

            <Divider orientation="left">Credit Memo</Divider>

            <Table
              dataSource={addKeysToArray([
                ...state.credit_memo_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.credit_memo_items, (o) =>
                    round(o.total_amount)
                  ),

                  balance: sumBy(state.credit_memo_items, (o) =>
                    round(o.balance)
                  ),

                  credit_amount: sumBy(state.credit_memo_items, (o) =>
                    round(o.credit_amount)
                  ),
                },
              ])}
              columns={credit_memo_column}
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
                ...state.credit_memo_items,
                {
                  footer: 1,
                  total_amount: sumBy(state.credit_memo_items, (o) =>
                    round(o.total_amount)
                  ),

                  credit_memo_amount: sumBy(state.credit_memo_items, (o) =>
                    round(o.credit_memo_amount)
                  ),
                },
              ])}
              columns={credit_memo_column}
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
