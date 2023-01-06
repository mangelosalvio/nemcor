import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Collapse,
  PageHeader,
  Button,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";
import {
  EditOutlined,
  CloseOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
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
  onFinalize,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import {
  onSupplierSearch,
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
  onEmployeeSearch,
  onDeductionSearch,
  onBranchSearch,
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
  DISCOUNT_PERCENT,
  DISCOUNT_VALUE,
  PENDING,
  USER_ADMINISTRATOR,
} from "../../utils/constants";
import { sumBy } from "lodash";
import { Link } from "react-router-dom";
import validator from "validator";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
import RadioGroupFieldGroup from "../../commons/RadioGroupFieldGroup";
import {
  jo_status_options,
  received_with_options,
} from "./../../utils/Options";
import CheckboxGroupFieldGroup from "../../commons/CheckboxGroupFieldGroup";
import ItemsFields from "../../commons/ItemsField";
import ItemsNoCostField from "../../commons/ItemsNoCostField";
import FormButtons from "../../commons/FormButtons";

import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/scheduled-deductions/";
const title = "Scheduled Deductions";

const date_fields = ["date", "start_date"];

const transaction_counter = {
  label: "Doc #",
  key: "doc_no",
};

const initialValues = {
  _id: null,
  [transaction_counter.key]: null,
  date: moment(),
};

const initialItemValues = {
  quantity: "",
  unit: "",
  description: "",
  remarks: "",
};

export default function ScheduledDeductionForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(false);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [options, setOptions] = useState({
    suppliers: [],
    stocks: [],
  });
  const [search_state, setSearchState] = useState({
    period_covered: [moment().subtract({ month: 2 }), moment()],
    warehouse: null,
    to_warehouse: null,
    branch_reference: "",
  });

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: transaction_counter.label,
      dataIndex: transaction_counter.key,
    },
    {
      title: "Date Created",
      dataIndex: ["date"],
      render: (date) => moment(date).format("MM/DD/YY"),
    },
    {
      title: "Date Started",
      dataIndex: ["date_started"],
      render: (date) => moment(date).format("MM/DD/YY"),
    },
    {
      title: "Employee",
      dataIndex: ["employee", "name"],
    },
    {
      title: "Branch",
      dataIndex: ["employee", "branch"],
      render: (branch) => `${branch?.company?.name} - ${branch?.name}`,
    },
    {
      title: "Deduction",
      dataIndex: ["deduction", "name"],
    },
    {
      title: "Total Amount",
      dataIndex: ["total_amount"],
      align: "center",
      render: (value) => numberFormat(value),
    },
    {
      title: "No. of Paydays",
      dataIndex: ["no_of_pay_days"],
      align: "center",
      render: (value) => numberFormat(value),
    },
    {
      title: "Deduction per Payday",
      dataIndex: ["deduction_amount"],
      align: "center",
      render: (value) => numberFormat(value),
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

  const computeDeduction = useCallback(({ total_amount, no_of_pay_days }) => {
    return round(total_amount / parseFloat(no_of_pay_days || 1));
  }, []);

  const computeNumberOfPayDays = useCallback(
    ({ total_amount, deduction_amount }) => {
      const no_of_pay_days = round(
        total_amount / parseFloat(deduction_amount || 1)
      );

      return no_of_pay_days;
    },
    []
  );

  return (
    <Content className="content-padding">
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
                advance_search: search_state,
              });
            }}
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setState({ ...initialValues, date: moment() });
              setRecords([]);
            }}
          />
        </div>
      </div>

      {/* Start of Advance Search */}
      <Row>
        <Col span={24} className="m-b-1">
          <Collapse>
            <Panel header="Advance Search">
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
                        value={search_state.period_covered}
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
                        label="Branch"
                        value={
                          search_state.branch &&
                          `${search_state.branch?.company?.name}-${state.branch?.name}`
                        }
                        onSearch={(value) =>
                          onBranchSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const branch = options.branches?.[index] || null;
                          setSearchState((prevState) => ({
                            ...prevState,
                            branch,
                          }));
                        }}
                        formItemLayout={formItemLayout}
                        data={options.branches}
                        column="display_name"
                      />
                    </Col>
                    <Col span={8}>
                      <SelectFieldGroup
                        label="To Branch"
                        value={search_state.to_warehouse?.name}
                        onSearch={(value) =>
                          onWarehouseSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const to_warehouse = options.warehouses[index];
                          setSearchState((prevState) => ({
                            ...prevState,
                            to_warehouse,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.warehouses}
                        column="name"
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col span={8}>
                      <TextFieldGroup
                        label="Reference"
                        name="branch_reference"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.branch_reference}
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
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={() => {
                              onSearch({
                                page: 1,
                                search_keyword,
                                url,
                                setRecords,
                                setTotalRecords,
                                setCurrentPage,
                                setErrors,
                                advance_search: search_state,
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
      </Row>
      {/* End of Advanced Search */}

      <div style={{ background: "#fff", padding: 24 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={(values) => {
              if (!loading) {
                onSubmit({
                  values: state,
                  auth,
                  url,
                  setErrors,
                  setState,
                  date_fields,
                  setLoading,
                });
              }
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
              disabled
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
              showTime={false}
            />
            <DatePickerFieldGroup
              label="Start Date"
              name="start_date"
              value={state.start_date}
              onChange={(value) => {
                onChange({
                  key: "start_date",
                  value: value?.startOf("day"),
                  setState,
                });
              }}
              error={errors.start_date}
              formItemLayout={formItemLayout}
              showTime={false}
            />
            <SelectFieldGroup
              label="Employee"
              value={state.employee?.name}
              onFocus={() => {
                onEmployeeSearch({
                  value: "",
                  setOptions,
                });
              }}
              onSearch={(value) => onEmployeeSearch({ value, setOptions })}
              onChange={(index) => {
                const employee = options.employees?.[index] || null;

                setState((prevState) => ({
                  ...prevState,
                  employee,
                }));
              }}
              error={errors.employee}
              formItemLayout={formItemLayout}
              data={options.employees}
              column="display_name"
            />
            <SelectFieldGroup
              label="Deduction"
              value={state.deduction?.name}
              onFocus={() =>
                onDeductionSearch({
                  value: "",
                  setOptions,
                })
              }
              onSearch={(value) => onDeductionSearch({ value, setOptions })}
              onChange={(index) => {
                const deduction = options.deductions?.[index] || null;

                setState((prevState) => ({
                  ...prevState,
                  deduction,
                }));
              }}
              error={errors.deduction}
              formItemLayout={formItemLayout}
              data={options.deductions}
              column="name"
            />
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Total Amount/Balance"
                  name="total_amount"
                  value={state.total_amount}
                  error={errors.total_amount}
                  onChange={(e) => {
                    const target = e.target;
                    setState((prevState) => ({
                      ...prevState,
                      total_amount: target.value,
                      deduction_amount: computeDeduction({
                        total_amount: target.value,
                        no_of_pay_days: state.no_of_pay_days,
                      }),
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  label="No. of Pay Days"
                  name="no_of_pay_days"
                  value={state.no_of_pay_days}
                  error={errors.no_of_pay_days}
                  onChange={(e) => {
                    const target = e.target;
                    setState((prevState) => ({
                      ...prevState,
                      no_of_pay_days: target.value,
                      deduction_amount: computeDeduction({
                        no_of_pay_days: target.value,
                        total_amount: state.total_amount,
                      }),
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Deduction Amount"
                  name="deduction_amount"
                  value={state.deduction_amount}
                  error={errors.deduction_amount}
                  onChange={(e) => {
                    const target = e.target;
                    const no_of_pay_days = computeNumberOfPayDays({
                      total_amount: state.total_amount,
                      deduction_amount: target.value,
                    });

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                        no_of_pay_days,
                      };
                    });
                  }}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>
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
            <Form.Item {...tailFormItemLayout} className="m-t-1">
              <div className="field is-grouped">
                <FormButtons
                  state={state}
                  auth={auth}
                  loading={loading}
                  url={url}
                  transaction="scheduled-deductions"
                  onDelete={
                    isEmpty(state?._id)
                      ? null
                      : () => {
                          onDelete({
                            id: state._id,
                            url,
                            user: auth.user,
                            cb: () => {
                              onSearch({
                                page: current_page,
                                search_keyword,
                                url,
                                setRecords,
                                setTotalRecords,
                                setCurrentPage,
                                setErrors,
                                advance_search: search_state,
                              });
                            },
                          });
                        }
                  }
                  initialValues={initialValues}
                  initialItemValues={initialItemValues}
                  setState={setState}
                  setItem={setItem}
                  has_print={false}
                  // onFinalize={() =>
                  //   onFinalize({
                  //     id: state._id,
                  //     url,
                  //     user: auth.user,
                  //     edit,
                  //     setState,
                  //     setErrors,
                  //     setRecords,
                  //     date_fields,
                  //   })
                  // }
                  onSearch={() => {
                    onSearch({
                      page: current_page,
                      search_keyword,
                      url,
                      setRecords,
                      setTotalRecords,
                      setCurrentPage,
                      setErrors,
                      advance_search: search_state,
                    });
                  }}
                />
              </div>
            </Form.Item>
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
                  advance_search: search_state,
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
