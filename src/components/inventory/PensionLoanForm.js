import React, { useState, useRef, useEffect } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import ItemsField from "../../commons/ItemsField";
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
  DatePicker,
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
  onCompanySearch,
  onBranchSearch,
  onClaimTypeSearch,
} from "./../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { sumBy, uniq } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import FormButtons from "../../commons/FormButtons";
import classNames from "classnames";
import {
  CANCELLED,
  DELIVERY_TYPE_COMPANY_DELIVERED,
  DELIVERY_TYPE_DELIVERED_BY_SUPPLIER,
  DELIVERY_TYPE_PICKUP_BY_CUSTOMER,
  DELIVERY_TYPE_PICKUP_DEPOT,
  DELIVERY_TYPE_PICKUP_TANK_FARM,
  OPEN,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";

import { delivery_type_options } from "../../utils/Options";
import { computeTotalAmount } from "../../utils/computations";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/pensions/";
const title = "Pension - Request for Loan Release";

const initialItemValues = {
  stock: null,
  quantity: "",
  price: "",
  freight: "",
  amount: "",
  open_quantity: false,
};

const transaction_counter = {
  label: "Doc #",
  key: "doc_no",
};

const date_fields = [
  "date",
  "date_request",
  "date_release",
  "datetime",
  "date_start",
  "date_sadd",
  "date_end1",
  "date_start2",
  "date_end2",
  "date_eadd",
  "date_approved",
  "slupdate",
];

export default function PensionLoanForm({ navigate }) {
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
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);

  const [search_state, setSearchState] = useState({});

  const initialValues = {
    _id: null,
    so_no: null,
    date: moment(),
    date_needed: null,
    customer: null,
    remarks: "",
    items: [],
    warehouse: null,

    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Account",
      dataIndex: ["account", "account"],
    },
    {
      title: "Branch",
      dataIndex: ["branch", "name"],
    },
    {
      title: "Claim",
      dataIndex: ["claim_type", "name"],
    },
    {
      title: "Date Req.",
      dataIndex: "date_request",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Date Release",
      dataIndex: "date_release",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Monthly Pension",
      dataIndex: ["mo_pension"],
      render: (value) => numberFormat(value),
    },
    {
      title: "Approved Term",
      dataIndex: ["term"],
    },
    {
      title: "Total Loan",
      dataIndex: ["original_prin"],
      render: (value) => numberFormat(value),
    },
    {
      title: "Addtl Loan",
      dataIndex: ["additional_prin"],
      render: (value) => numberFormat(value),
    },
    {
      title: "Total Loan",
      dataIndex: ["original_prin"],
      render: (value) => numberFormat(value),
    },
    {
      title: "Net Cash",
      dataIndex: ["net_cash"],
      render: (value) => numberFormat(value),
    },

    {
      title: "Status",
      dataIndex: ["status"],
      align: "center",
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
      title: "Item",
      dataIndex: ["stock", "name"],
    },

    {
      title: "Qty",
      dataIndex: "quantity",
      align: "right",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 &&
          (isEmpty(state.status) || state.status?.approval_status === OPEN) &&
          isEmpty(state.deleted) ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  type="number"
                  step={0.01}
                  className="has-text-right"
                  value={record.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let items = [...state.items];
                      let item = items[index];
                      const quantity = value;
                      const amount = round(quantity * item.price);

                      items[index] = {
                        ...items[index],
                        quantity,
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
            `${numberFormat(record.quantity)}`
          )}
        </span>
      ),
    },
    {
      title: "W/D",
      width: 150,
      align: "right",
      dataIndex: ["confirmed_quantity"],
      render: (value) => numberFormat(value),
    },
    {
      title: "UOM",
      width: 150,
      align: "center",
      dataIndex: ["unit_of_measure", "unit"],
    },
    {
      title: "Price",
      dataIndex: ["price"],
      align: "right",
      width: 100,
      render: (value, record, index) =>
        record.footer !== 1 &&
        (isEmpty(state.status?.approval_status) ||
          [state.status?.approval_status].includes(OPEN)) ? (
          <Input
            value={value}
            className="has-text-right"
            onChange={(e) => {
              const price = e.target.value;
              const quantity = record.quantity;
              const amount = computeTotalAmount({
                quantity,
                price,
              });

              const items = [...state.items];
              items[index] = {
                ...items[index],
                price,
                amount,
              };

              setState((prevState) => ({
                ...prevState,
                items,
              }));
            }}
          />
        ) : (
          value && numberFormat(value)
        ),
    },
    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      width: 150,
      render: (value) => value && numberFormat(value),
    },
    {
      title: "Open Qty",
      dataIndex: ["is_open_quantity"],
      align: "center",
      width: 80,
      render: (checked, record) =>
        record.footer !== 1 && checked && <span>&#10004;</span>,
    },
    {
      title: "Unit",
      width: 150,
      align: "center",
      dataIndex: ["unit", "name"],
    },
    {
      title: "",
      key: "action",
      align: "center",
      width: 100,
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            (isEmpty(state.status) || state.status?.approval_status === OPEN) &&
            isEmpty(state.deleted) && (
              <span
                onClick={() =>
                  onDeleteItem({
                    field: "items",
                    index,
                    setState,
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

  useEffect(() => {
    const department = auth?.user?.department;

    setState((prevState) => {
      return {
        ...prevState,
        ...(auth.user?.company?._id && {
          company: auth.user?.company,
        }),
      };
    });

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
      const total_amount = sumBy(state.items, (o) => o.amount);
      const gross_amount = total_amount;
      let net_amount = gross_amount;

      (state.discounts || []).forEach((discount) => {
        let discount_rate = validator.isNumeric(discount.toString())
          ? 1 - round(discount) / 100
          : 1;

        net_amount = net_amount * discount_rate;
      });

      const total_discount_amount = round(gross_amount - net_amount);

      return {
        ...prevState,
        total_amount,
        gross_amount,
        total_discount_amount,
      };
    });

    return () => {};
  }, [state.items, state.discounts]);

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
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setState({
                ...initialValues,
                date: moment(),
                ...(auth.user?.company?._id && {
                  company: auth.user?.company,
                }),
              });
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
                        label="Date Released"
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
                        value={search_state.customer?.name}
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
                        label="Doc#"
                        name="doc_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.doc_no}
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
                    <Col span={8}>
                      <SelectFieldGroup
                        label="Claim Type"
                        value={search_state.stock?.name}
                        onSearch={(value) =>
                          onStockSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const stock = options.stocks[index];
                          setSearchState((prevState) => ({
                            ...prevState,
                            stock,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.stocks}
                        column="display_name"
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
              <Row>
                <Col span={12}>
                  <TextFieldGroup
                    label={transaction_counter.label}
                    value={state[transaction_counter.key]}
                    formItemLayout={smallFormItemLayout}
                    readOnly
                  />
                </Col>
              </Row>
            )}

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  label="Account"
                  value={state.account?.account}
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
              <Col span={12}>
                <DatePickerFieldGroup
                  label="Date Requested"
                  name="date_request"
                  value={state.date_request}
                  onChange={(value) => {
                    onChange({
                      key: "date_request",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_request}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <SelectFieldGroup
                  label="Branch"
                  value={state.branch?.name}
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
                  formItemLayout={smallFormItemLayout}
                  data={options.branches}
                  column="name"
                />
              </Col>
              <Col span={12}>
                <DatePickerFieldGroup
                  label="Date of Release"
                  name="date_release"
                  value={state.date_release || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_release",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_release}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  label="Type/Claim"
                  value={state.claim_type?.name}
                  onSearch={(value) =>
                    onClaimTypeSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const claim_type = options.claim_types?.[index] || null;

                    setSearchState((prevState) => ({
                      ...prevState,
                      claim_type,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.claim_types}
                  column="name"
                />
              </Col>
              <Col span={4} className="ant-form-item-label">
                <label>Basic/Total Mon. Pension</label>
              </Col>
              <Col span={8} className=" ant-form ant-form-inline ">
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.mo_pension}
                    name="mo_pension"
                    className="has-text-right width-100px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
                <div className="ant-form-item align-items-center flex">/</div>
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.total_pension}
                    name="total_pension"
                    className="has-text-right width-100px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <TextAreaGroup
                  label="Memo"
                  name="memo"
                  value={state.memo}
                  error={errors.memo}
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
                  label="Monthly Pension Pawned"
                  name="pawned"
                  value={state.pawned}
                  error={errors.pawned}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                  formItemLayout={smallFormItemLayout}
                />
                <TextFieldGroup
                  label="Approved Term"
                  name="term"
                  value={state.term}
                  error={errors.term}
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
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Sales Consultant"
                  name="scname"
                  value={state.scname}
                  error={errors.scname}
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
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Sales Commission"
                  name="sc_commission"
                  value={state.sc_commission}
                  error={errors.sc_commission}
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
                <SelectFieldGroup
                  label="Rel. to Branch"
                  value={state.release_to_branch?.name}
                  onSearch={(value) =>
                    onBranchSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const release_to_branch = options.branches?.[index] || null;
                    setSearchState((prevState) => ({
                      ...prevState,
                      release_to_branch,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.branches}
                  column="name"
                />
              </Col>
            </Row>
            <Row>
              <Col offset={12} span={12}>
                <SelectFieldGroup
                  label="Rel. Notarial Fee to"
                  value={state.release_notarial_fee_to_branch?.name}
                  onSearch={(value) =>
                    onBranchSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const release_notarial_fee_to_branch =
                      options.branches?.[index] || null;
                    setSearchState((prevState) => ({
                      ...prevState,
                      release_notarial_fee_to_branch,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.branches}
                  column="name"
                />
              </Col>
            </Row>

            <Divider orientation="left">Loan Details</Divider>

            <Row>
              <Col span={3} className="ant-form-item-label">
                <label>Loan - Pawned #1</label>
              </Col>
              <Col span={5} className="ant-form ant-form-inline">
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.pawned_orig}
                    name="pawned_orig"
                    className="has-text-right width-100px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
                <div className="ant-form-item align-items-center flex">
                  X Term:
                </div>
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.term_orig}
                    name="term_orig"
                    className="has-text-right width-40px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
              </Col>
              <Col span={2} className="flex align-items-center">
                Total Loan
              </Col>
              <Col span={10} className="ant-form-inline">
                <div className="ant-form-item has-text-weight-bold flex align-items-center m-b-0">
                  {numberFormat(state.original_prin)}
                </div>
                <div className="ant-form-inline flex align-items-center">
                  Start Date
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  <DatePicker
                    value={state.date_start}
                    onChange={(date) => {
                      onChange({
                        key: "date_start",
                        value: date,
                        setState,
                      });
                    }}
                  />
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  End Date
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  <DatePicker
                    value={state.date_end1}
                    onChange={(date) => {
                      onChange({
                        key: "date_end1",
                        value: date,
                        setState,
                      });
                    }}
                  />
                </div>
              </Col>
            </Row>

            {/* LOAN - PAWNED #2 */}
            <Row>
              <Col span={3} className="ant-form-item-label">
                <label>Loan - Pawned #2</label>
              </Col>
              <Col span={9} className="ant-form ant-form-inline">
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.pawned_add}
                    name="pawned_add"
                    className="has-text-right width-100px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
                <div className="ant-form-item align-items-center flex">
                  X Term:
                </div>
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.term_add}
                    name="term_add"
                    className="has-text-right width-40px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
              </Col>
            </Row>

            {/* ADDITIONAL LOAN - PAWNED */}
            <Row>
              <Col span={3} className="ant-form-item-label">
                <label>Addtl Loan - Pawned</label>
              </Col>
              <Col span={5} className="ant-form ant-form-inline">
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.pawned_orig2}
                    name="pawned_orig2"
                    className="has-text-right width-100px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
                <div className="ant-form-item align-items-center flex">
                  X Term:
                </div>
                <div className="ant-form-item">
                  <Input
                    type="number"
                    step={0.01}
                    value={state.term_orig2}
                    name="term_orig2"
                    className="has-text-right width-40px"
                    onChange={(e) => {
                      const target = e.target;

                      setState((prevState) => {
                        return {
                          ...prevState,
                          [target.name]: target.value,
                        };
                      });
                    }}
                  />
                </div>
              </Col>
              <Col span={2} className="flex align-items-center">
                Total Additional
              </Col>
              <Col span={9} className="ant-form-inline">
                <div className="ant-form-item has-text-weight-bold flex align-items-center m-b-0">
                  {numberFormat(state.additional_prin)}
                </div>
                <div className="ant-form-inline flex align-items-center">
                  Start Date
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  <DatePicker
                    value={state.date_sadd}
                    onChange={(date) => {
                      onChange({
                        key: "date_sadd",
                        value: date,
                        setState,
                      });
                    }}
                  />
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  End Date
                </div>
                <div className="ant-form-inline flex align-items-center m-l-1">
                  <DatePicker
                    value={state?.date_eadd || null}
                    onChange={(date) => {
                      onChange({
                        key: "date_eadd",
                        value: date,
                        setState,
                      });
                    }}
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col span={12} className="has-text-weight-bold">
                LESS:
              </Col>
            </Row>
            <Row>
              <Col span={4} className="flex align-items-center">
                Interest - Original
              </Col>
              <Col span={2} className="has-text-right align-items-center flex">
                {numberFormat(state.interest_orig)}
              </Col>
              <Col span={12} offset={6}>
                <TextFieldGroup
                  label="Interest Rate"
                  name="intrate_orig"
                  value={state.intrate_orig}
                  error={errors.intrate_orig}
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
            <Row>
              <Col span={4} className="flex align-items-center">
                Interest - Additional
              </Col>
              <Col span={2} className="has-text-right align-items-center flex">
                {numberFormat(state.interest_orig)}
              </Col>
              <Col span={12} offset={6}>
                <TextFieldGroup
                  label="Interest Rate"
                  name="intrate_add"
                  value={state.intrate_add}
                  error={errors.intrate_add}
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
            <Row>
              <Col span={4} className="flex align-items-center">
                Interest - Advance
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.interest_adv}
                  name="interest_adv"
                  className="has-text-right "
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col span={4} className="flex align-items-center">
                Legal Fee
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.fee_legal}
                  name="fee_legal"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col span={4} className="flex align-items-center">
                Old Account
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.oldacc}
                  name="oldacc"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col span={4} className="flex align-items-center">
                CI Fee
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.fee_ci}
                  name="fee_ci"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
              <Col span={10} offset={6}>
                <TextFieldGroup
                  disabled
                  label="Total Deductions"
                  name="tdeduction"
                  value={numberFormat(state.tdeduction)}
                  error={errors.tdeduction}
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
            <Row>
              <Col span={4} className="flex align-items-center">
                Service Charge
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.fee_sc}
                  name="fee_sc"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
              <Col span={10} offset={6}>
                <TextFieldGroup
                  disabled
                  label="Net Cash Out"
                  name="netcash"
                  value={numberFormat(state.netcash)}
                  error={errors.netcash}
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
            <Row>
              <Col span={4} className="flex align-items-center">
                Collection Fee
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.fee_cf}
                  name="fee_cf"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>
              <Col span={10} offset={6}>
                <SelectFieldGroup
                  label="Release to"
                  value={state.net_cash_release_to_branch?.name}
                  onSearch={(value) =>
                    onBranchSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const net_cash_release_to_branch =
                      options.branches?.[index] || null;
                    setSearchState((prevState) => ({
                      ...prevState,
                      net_cash_release_to_branch,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.branches}
                  column="name"
                />
              </Col>
            </Row>
            <Row>
              <Col span={4} className="flex align-items-center">
                Gawad
              </Col>
              <Col span={4} className="ant-form-item">
                <Input
                  type="number"
                  step={0.01}
                  value={state.gawad}
                  name="gawad"
                  className="has-text-right ant-input"
                  onChange={(e) => {
                    const target = e.target;

                    setState((prevState) => {
                      return {
                        ...prevState,
                        [target.name]: target.value,
                      };
                    });
                  }}
                />
              </Col>

              <Col span={6}>
                <SelectFieldGroup
                  label="Release To"
                  value={state.gawad_release_to_branch?.name}
                  onSearch={(value) =>
                    onBranchSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const gawad_release_to_branch =
                      options.branches?.[index] || null;
                    setSearchState((prevState) => ({
                      ...prevState,
                      gawad_release_to_branch,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.branches}
                  column="name"
                />
              </Col>
              <Col span={10}>
                <TextFieldGroup
                  label="First Release Amount"
                  name="relamount"
                  value={state.relamount}
                  error={errors.relamount}
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
