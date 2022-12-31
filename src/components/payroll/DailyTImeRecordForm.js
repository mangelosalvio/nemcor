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
  Input,
  Col,
  Row,
  Collapse,
  PageHeader,
  Button,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";
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
import SupplierFormModal from "../modals/SupplierFormModal";
import {
  onSupplierSearch,
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
  onNatureOfWorkSearch,
  onEmployeeSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { sumBy, uniq, uniqBy } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import FormButtons from "../../commons/FormButtons";
import classNames from "classnames";
import {
  CANCELLED,
  NATURE_OF_WORK_TYPE_GROUP,
  NATURE_OF_WORK_TYPE_INDIVIDUAL,
  OPEN,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { TextField } from "@material-ui/core";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/daily-time-records/";
const title = "Daily Time Record Form";

const initialItemValues = {
  employee: null,
  field_no: "",
  work_description: "",
  no_of_hours: "",
  amount: "",
};

const transaction_counter = {
  label: "DTR #",
  key: "dtr_no",
};

const date_fields = ["date"];

export default function DailyTimeRecordForm({ navigate }) {
  const params = useParams();
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [dr_numbers, setDrNumbers] = useState([]);
  const [options, setOptions] = useState({
    suppliers: [],
    stocks: [],
    purchase_orders: [],
    warehouses: [],
  });
  const [page_size, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const supplierFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const workDescriptionField = useRef(null);
  const fieldNumberField = useRef(null);
  const amountField = useRef(null);
  const numberOfHoursField = useRef(null);
  const addItemButton = useRef(null);
  const employeeField = useRef(null);

  const [search_state, setSearchState] = useState({});

  const initialValues = {
    _id: null,
    rr_no: null,
    date: moment(),
    supplier: null,
    warehouse: auth.user?.warehouse,
    remarks: "",
    items: [],
    discounts: [],

    purchase_order: null,
    stock_release: null,
    sales_return: null,
    customer: null,

    gross_amount: 0,
    total_discount_amount: 0,
    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "DTR #",
      dataIndex: "dtr_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Nature of Work",
      dataIndex: ["nature_of_work", "name"],
    },
    {
      title: "Field No.",
      dataIndex: ["items"],
      render: (items) =>
        uniqBy((items || []).map((o) => o.field_no)).join(", "),
    },
    {
      title: "Gross Tonnage",
      dataIndex: ["gross_area"],
      render: (value) => value > 0 && value,
    },
    {
      title: "Trash Rate",
      dataIndex: ["trash_rate"],
      render: (value) => value > 0 && value,
    },
    {
      title: "Net Tonnage",
      dataIndex: ["net_area"],
      render: (value) => value > 0 && value,
    },
    {
      title: "Rate per Unit",
      align: "right",
      dataIndex: ["rate_per_unit"],
    },
    {
      title: "Qty Unit",
      align: "right",
      dataIndex: ["quantity_units"],
      render: (value) => value > 0 && numberFormat(value),
    },
    {
      title: "Gross Amount",
      align: "right",
      dataIndex: ["gross_amount"],
      render: (value) => value > 0 && numberFormat(value),
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

  const items_column = [
    {
      title: "#",
      width: 50,
      align: "center",
      render: (value, record, index) => record.footer !== 1 && index + 1,
    },
    {
      title: "Employee",
      dataIndex: ["employee", "name"],
    },
    {
      title: "Field No.",
      dataIndex: ["field_no"],
    },
    {
      title: "Work Desc.",
      dataIndex: ["work_description"],
    },

    ...(state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_INDIVIDUAL
      ? [
          {
            title: "No. of Hours",
            dataIndex: "no_of_hours",
            align: "right",
            width: 200,
            render: (value, record, index) => (
              <span>
                {record.footer !== 1 &&
                isEmpty(state.status) &&
                isEmpty(state.deleted) ? (
                  <Row gutter={8}>
                    <Col span={24}>
                      <Input
                        type="number"
                        step={0.01}
                        className="has-text-right"
                        value={record.no_of_hours}
                        onChange={(e) => {
                          const value = e.target.value;
                          setState((prevState) => {
                            let items = [...state.items];
                            let item = items[index];
                            const no_of_hours = value;
                            const amount = round(
                              no_of_hours * state.rate_per_unit
                            );

                            items[index] = {
                              ...items[index],
                              no_of_hours,
                              amount,
                            };

                            return {
                              ...prevState,
                              items,
                            };
                          });
                        }}
                        align="right"
                      />
                    </Col>
                  </Row>
                ) : (
                  record.footer !== 1 && `${numberFormat(record.no_of_hours)}`
                )}
              </span>
            ),
          },
        ]
      : []),

    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      width: 200,
      render: (value) => numberFormat(value),
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            isEmpty(state.status) &&
            isEmpty(state.deleted) && (
              <span
                onClick={() =>
                  setState((prevState) => {
                    let items = [...prevState.items];
                    items.splice(index, 1);

                    items = recomputeIndividualAmount({
                      type: state.nature_of_work?.work_type,
                      items,
                      gross_amount: state.gross_amount,
                    });

                    return {
                      ...prevState,
                      items,
                    };
                  })
                }
              >
                <i className="fas fa-trash-alt"></i>
              </span>
            )}
        </span>
      ),
    },
  ];

  const recomputeIndividualAmount = useCallback(
    ({ type, items, gross_amount }) => {
      if (type === NATURE_OF_WORK_TYPE_GROUP) {
        const amount_per_person = round(gross_amount / (items || [])?.length);

        return items.map((o) => {
          return {
            ...o,
            amount: amount_per_person,
          };
        });
      }

      return items;
    },
    []
  );

  //compute for gross amount
  useEffect(() => {
    if (
      state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_GROUP &&
      !state.nature_of_work?.is_milling
    ) {
      const gross_amount = parseFloat(
        (state.rate_per_unit || 0) * (state.quantity_units || 0)
      );
      setState((prevState) => {
        return {
          ...prevState,
          gross_amount,
        };
      });
    } else if (
      state.nature_of_work?.is_milling &&
      state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_GROUP
    ) {
      const trash_area = parseFloat(
        ((state.gross_area || 0) * (state.trash_rate || 0)) / 100
      );
      const net_area = parseFloat((state.gross_area || 0) - (trash_area || 0));

      const gross_amount = parseFloat(net_area * (state.rate_per_unit || 0));

      setState((prevState) => {
        return {
          ...prevState,
          gross_amount,
          net_area,
        };
      });
    }

    return () => {};
  }, [
    state.rate_per_unit,
    state.quantity_units,
    state.nature_of_work,
    state.gross_area,
    state.trash_rate,
  ]);

  useEffect(() => {
    //auto compute amount
    if (state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_INDIVIDUAL) {
      setItem((prevState) => {
        const amount = round(state.rate_per_unit * item.no_of_hours);
        return {
          ...prevState,
          amount,
        };
      });
    }

    return () => {};
  }, [
    state.nature_of_work?.work_type,
    ,
    state.rate_per_unit,
    item.no_of_hours,
  ]);

  useEffect(() => {
    if (params?.id) {
      edit({
        record: {
          _id: params.id,
        },
        setState,
        setErrors,
        setRecords,
        url,
        date_fields,
      });
    }
    return () => {};
  }, []);

  useEffect(() => {
    const amount = round(
      round(round(item.case_quantity) * round(item.case_price)) +
        round(round(item.quantity) * round(item.price))
    );

    setItem((prevState) => {
      return {
        ...prevState,
        amount,
      };
    });

    return () => {};
  }, [item.case_quantity, item.quantity, item.case_price, item.price]);

  const can_edit =
    (isEmpty(state.status) || [OPEN].includes(state.status?.approval_status)) &&
    isEmpty(state.deleted);

  return (
    <Content className="content-padding">
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
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setState({ ...initialValues, date: moment() });
              setItem(initialItemValues);
              setRecords([]);
            }}
          />
        </div>
      </div>

      <Row>
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
                        label="Nature of Work"
                        value={search_state.nature_of_work?.name}
                        onSearch={(value) =>
                          onNatureOfWorkSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const nature_of_work =
                            options.nature_of_works?.[index] || null;

                          setSearchState((prevState) => ({
                            ...prevState,
                            nature_of_work,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.nature_of_works}
                        column="name"
                      />
                    </Col>
                    <Col span={8}>
                      <TextFieldGroup
                        label="DTR #"
                        name="dtr_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.dtr_no}
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
                        value={search_state.approval_status}
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
                    <Col span={8}></Col>
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
      </Row>

      <div style={{ background: "#fff", padding: 24 }}>
        <Row>
          <Col span={12}>
            <span className="module-title">{title}</span>
          </Col>
          {/* <Col span={12} className="has-text-right">
            <Button
              type="link"
              onClick={() => {
                navigate("/cashier");
              }}
            >
              Go Back Cashiering
            </Button>
          </Col> */}
        </Row>

        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={() => {
              onSubmit({
                values: state,
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
              value={state.date || null}
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
              disabled={state.items?.length > 0}
              label="Nature of Work"
              value={state.nature_of_work?.name}
              onSearch={(value) => onNatureOfWorkSearch({ value, setOptions })}
              onChange={(index) => {
                const nature_of_work = options.nature_of_works?.[index] || null;

                console.log(options.nature_of_works?.[index]);
                console.log(nature_of_work);
                setState((prevState) => ({
                  ...prevState,
                  nature_of_work,
                  rate_per_unit: nature_of_work?.rate || "",
                }));
                setItem((prevState) => {
                  return {
                    ...prevState,
                    work_description: nature_of_work?.name || "",
                  };
                });
              }}
              formItemLayout={formItemLayout}
              data={options.nature_of_works}
              column="name"
            />
            {state.nature_of_work?.is_milling && [
              <Row>
                <Col span={12}>
                  <TextFieldGroup
                    label="Gross Tonnage"
                    name="gross_area"
                    value={state.gross_area}
                    error={errors.gross_area}
                    onChange={(e) => {
                      onChange({
                        key: e.target.name,
                        value: e.target.value,
                        setState,
                      });
                    }}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    label="Trash Rate (%)"
                    name="trash_rate"
                    value={state.trash_rate}
                    error={errors.trash_rate}
                    onChange={(e) => {
                      onChange({
                        key: e.target.name,
                        value: e.target.value,
                        setState,
                      });
                    }}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    label="Net Tonnage"
                    name="net_area"
                    value={state.net_area}
                    error={errors.net_area}
                    onChange={(e) => {
                      onChange({
                        key: e.target.name,
                        value: e.target.value,
                        sfetState,
                      });
                    }}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
              </Row>,
            ]}

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Rate per Unit"
                  name="rate_per_unit"
                  value={state.rate_per_unit}
                  error={errors.rate_per_unit}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>

              {state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_GROUP &&
                !state.nature_of_work?.is_milling && (
                  <Col span={12}>
                    <TextFieldGroup
                      label="Quantity Units"
                      name="quantity_units"
                      value={state.quantity_units}
                      error={errors.quantity_units}
                      onChange={(e) => {
                        onChange({
                          key: e.target.name,
                          value: e.target.value,
                          setState,
                        });
                      }}
                      formItemLayout={smallFormItemLayout}
                    />
                  </Col>
                )}
            </Row>
            {state.nature_of_work?.work_type === NATURE_OF_WORK_TYPE_GROUP && (
              <Row>
                <Col span={12}>
                  <TextFieldGroup
                    label="Gross Amount"
                    name="gross_amount"
                    value={state.gross_amount}
                    error={errors.gross_amount}
                    onChange={(e) => {
                      onChange({
                        key: e.target.name,
                        value: e.target.value,
                        setState,
                      });
                    }}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
              </Row>
            )}

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
            {isEmpty(state.status) &&
              isEmpty(state.deleted) && [
                <Divider orientation="left" key="divider">
                  Details
                </Divider>,
                <Row key="form" className="ant-form-vertical" gutter="4">
                  <Col span={6}>
                    <SelectFieldGroup
                      inputRef={employeeField}
                      label="Employee"
                      value={item.employee?.name}
                      onSearch={(value) =>
                        onEmployeeSearch({ value, setOptions })
                      }
                      onChange={(index) => {
                        const employee = options.employees?.[index] || null;
                        setItem({
                          ...item,
                          employee,
                        });
                        fieldNumberField.current.focus();
                      }}
                      error={errors.employee}
                      formItemLayout={null}
                      data={options.employees}
                      column="display_name"
                    />
                  </Col>
                  <Col span={3}>
                    <TextFieldGroup
                      label="Field No."
                      value={item.field_no}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          field_no: e.target.value,
                        });
                      }}
                      error={errors.item_field_no}
                      formItemLayout={null}
                      inputRef={fieldNumberField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        workDescriptionField.current.focus();
                      }}
                    />
                  </Col>
                  <Col span={5}>
                    <TextFieldGroup
                      label="Work Desc."
                      value={item.work_description}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          work_description: e.target.value,
                        });
                      }}
                      error={errors.item_work_description}
                      formItemLayout={null}
                      inputRef={workDescriptionField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        if (
                          state.nature_of_work?.work_type ===
                          NATURE_OF_WORK_TYPE_INDIVIDUAL
                        ) {
                          numberOfHoursField.current.focus();
                        } else {
                          addItemButton.current.click();
                        }
                      }}
                    />
                  </Col>
                  {state.nature_of_work?.work_type ===
                    NATURE_OF_WORK_TYPE_INDIVIDUAL && [
                    <Col span={2} key="1">
                      <TextFieldGroup
                        label="Hours"
                        value={item.no_of_hours}
                        onChange={(e) => {
                          setItem({
                            ...item,
                            no_of_hours: e.target.value,
                          });
                        }}
                        error={errors.no_of_hours}
                        formItemLayout={null}
                        inputRef={numberOfHoursField}
                        onPressEnter={(e) => {
                          e.preventDefault();
                          amountField.current.focus();
                        }}
                      />
                    </Col>,
                    <Col span={3} key="2">
                      <TextFieldGroup
                        readOnly={true}
                        label="Amount"
                        value={item.amount}
                        onChange={(e) => {
                          setItem({
                            ...item,
                            amount: e.target.value,
                          });
                        }}
                        error={errors.amount}
                        formItemLayout={null}
                        inputRef={amountField}
                        onPressEnter={(e) => {
                          e.preventDefault();
                          addItemButton.current.click();
                        }}
                      />
                    </Col>,
                  ]}

                  <Col
                    span={2}
                    className="is-flex align-items-center add-button-height"
                  >
                    <input
                      type="button"
                      ref={addItemButton}
                      className="button is-primary "
                      onClick={() => {
                        setState((prevState) => {
                          let items = [
                            ...prevState.items,
                            {
                              ...item,
                            },
                          ];

                          items = recomputeIndividualAmount({
                            type: state.nature_of_work?.work_type,
                            items,
                            gross_amount: state.gross_amount,
                          });

                          return {
                            ...prevState,
                            items,
                          };
                        });

                        setItem((prevState) => {
                          return {
                            ...prevState,
                            employee: null,
                          };
                        });
                        employeeField.current.focus();
                        //compute rate per person if group
                      }}
                      value="Add"
                    />
                  </Col>
                </Row>,
              ]}
            <Table
              dataSource={addKeysToArray([
                ...state.items,
                {
                  footer: 1,
                  quantity: sumBy(state.items, (o) => round(o.quantity)),
                  case_quantity: sumBy(state.items, (o) =>
                    round(o.case_quantity)
                  ),
                  amount: sumBy(state.items, (o) => round(o.amount)),
                },
              ])}
              columns={items_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />
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
              onPrint={() => console.log("Print")}
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
                });
              },
              total: total_records,
              pageSize: page_size,
            }}
          />
        )}
      </div>
    </Content>
  );
}
