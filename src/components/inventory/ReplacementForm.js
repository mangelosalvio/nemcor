import React, { useState, useRef, useEffect } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";
import qs from "qs";

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
  Checkbox,
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
  hasAccess,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import SupplierFormModal from "../modals/SupplierFormModal";
import {
  onCustomerSearch,
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
  onBranchSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { sumBy, uniq } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useNavigate, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import FormButtons from "../../commons/FormButtons";
import classNames from "classnames";
import {
  ACCESS_ADD,
  ACCESS_ADVANCE_SEARCH,
  ACCESS_OPEN,
  ACCESS_PRICE_CHANGE,
  CANCELLED,
  OPEN,
  PAYMENT_TYPE_CASH,
  PAYMENT_TYPE_CHARGE,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import AccountFormModal from "../modals/AccountFormModal";
import ItemsField from "../../commons/ItemsField";
import computeItemDetails from "../../utils/computeItemDetails";
import ItemsNoPriceField from "../../commons/ItemsNoPriceField";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/replacement-receipts/";
const title = "Replacement Form";

const initialItemValues = {
  stock: null,
  case_quantity: null,
  quantity: null,
  case_price: null,
  price: null,
  amount: null,
};

const transaction_counter = {
  label: "RR #",
  key: "replacement_no",
};

const date_fields = ["date", "due_date", "invoice_date"];

export default function ReplacementForm({ payment_type }) {
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
  const accountFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);

  const navigate = useNavigate();
  const [search_state, setSearchState] = useState({
    payment_type,
  });

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
      title: transaction_counter.label,
      dataIndex: transaction_counter.key,
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "DR Date",
      dataIndex: "invoice_date",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Ref",
      dataIndex: "reference",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      render: (branch) => `${branch?.company?.name}-${branch?.name}`,
    },
    {
      title: "Account",
      dataIndex: ["account", "name"],
    },

    {
      title: "Items",
      dataIndex: "items",
      width: 350,
      render: (items) =>
        (items || [])
          .slice(0, 4)
          .map((o) => o?.stock?.name)
          .join("/ "),
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
          [undefined, null, OPEN].includes(state.status?.approval_status) ? (
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

                      items[index] = {
                        ...items[index],
                        ...computeItemDetails({
                          ...items[index],
                          quantity,
                        }),
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
    /* {
      title: "Price",
      dataIndex: "price",
      align: "right",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 &&
          [undefined, null, OPEN].includes(state.status?.approval_status) &&
          hasAccess({
            auth,
            access: ACCESS_PRICE_CHANGE,
            location,
          }) ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  disabled={
                    !hasAccess({
                      auth,
                      access: ACCESS_PRICE_CHANGE,
                      location,
                    })
                  }
                  type="number"
                  step={0.01}
                  className="has-text-right"
                  value={record.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let items = [...state.items];
                      let item = items[index];
                      const price = value;

                      items[index] = {
                        ...items[index],
                        ...computeItemDetails({
                          ...items[index],
                          price,
                        }),
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
            record.footer !== 1 && `${numberFormat(record.price)}`
          )}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right",
      width: 200,
      render: (value, record, index) => (
        <span>{`${numberFormat(record.amount)}`}</span>
      ),
    },
    {
      title: "Damaged",
      dataIndex: ["is_damaged"],
      width: 80,
      align: "center",
      render: (checked, record, index) =>
        record.footer !== 1 && (
          <Checkbox
            disabled={record.quantity > 0}
            name="is_damaged"
            checked={checked}
            onChange={(e) => {
              const target = e.target;
              const items = [...state.items];

              items[index] = {
                ...items[index],
                [target.name]: target.checked,
              };
              setState((prevState) => ({
                ...prevState,
                items,
              }));
            }}
          />
        ),
    }, */
    {
      title: "",
      key: "action",
      width: 80,
      align: "center",
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            [undefined, OPEN].includes(state.status?.approval_status) && (
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

  const payments_column = [
    {
      title: "Payment Method",
      dataIndex: ["payment_method"],
      render: (payment_method, record, index) =>
        record.footer !== 1 && (
          <SimpleSelectFieldGroup
            name="payment_method"
            value={payment_method}
            onChange={(value) => {
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                payment_method: value,
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
            error={errors?.approval_status}
            options={options?.payment_methods || []}
          />
        ),
    },

    {
      title: "Bank",
      dataIndex: ["bank"],
      render: (bank, record, index) =>
        record.footer !== 1 &&
        record.payment_method === "CHECK" && (
          <Input
            name="bank"
            value={bank}
            onChange={(e) => {
              const target = e.target;
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                [target.name]: target.value?.toUpperCase(),
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
          />
        ),
    },
    {
      title: "Check No.",
      dataIndex: ["check_no"],
      render: (check_no, record, index) =>
        record.footer !== 1 &&
        record.payment_method === "CHECK" && (
          <Input
            name="check_no"
            value={check_no}
            onChange={(e) => {
              const target = e.target;
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                [target.name]: target.value?.toUpperCase(),
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
          />
        ),
    },
    {
      title: "Check Date",
      dataIndex: ["check_date"],
      render: (check_date, record, index) =>
        record.footer !== 1 &&
        record.payment_method === "CHECK" && (
          <DatePicker
            onChange={(date) => {
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                check_date: date,
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
            value={check_date ? moment(check_date) : null}
          />
        ),
    },

    {
      title: "Reference",
      dataIndex: ["reference"],
      render: (reference, record, index) =>
        record.footer !== 1 && (
          <Input
            name="reference"
            value={reference}
            onChange={(e) => {
              const target = e.target;
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                [target.name]: target.value?.toUpperCase(),
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
          />
        ),
    },

    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      render: (amount, record, index) =>
        record.footer !== 1 ? (
          <Input
            className="has-text-right"
            type="number"
            step={0.01}
            name="amount"
            value={amount}
            onChange={(e) => {
              const target = e.target;
              let payments = [...state.payments];
              payments[index] = {
                ...payments[index],
                [target.name]: target.value?.toUpperCase(),
              };

              if (index === (state.payments || []).length - 1) {
                payments = [...payments, {}];
              }

              setState((prevState) => ({
                ...prevState,
                payments,
              }));
            }}
          />
        ) : (
          numberFormat(amount)
        ),
    },
    {
      title: "",
      key: "action",
      width: 80,
      align: "center",
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            [undefined, OPEN].includes(state.status?.approval_status) && (
              <span
                onClick={() =>
                  onDeleteItem({
                    field: "payments",
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
    axios
      .get("/api/payment-methods")
      .then((response) => {
        if (response.data) {
          setOptions((prevState) => ({
            ...prevState,
            payment_methods: response.data.map((o) => o.name),
          }));
        }
      })
      .catch((err) => {
        return message.error("There was an error processing your request");
      });

    return () => {};
  }, []);

  useEffect(() => {
    if ((state.payments || [])?.length <= 0) {
      setState((prevState) => ({
        ...prevState,
        payments: [{}],
      }));
    }

    return () => {};
  }, [state.payments]);

  useEffect(() => {
    setSearchState((prevState) => {
      return {
        ...prevState,
        payment_type,
      };
    });

    return () => {};
  }, [payment_type]);

  useEffect(() => {
    const branch = auth?.user?.branches?.[0] || null;

    if (branch?._id) {
      setSearchState((prevState) => {
        return {
          ...prevState,
          branch,
        };
      });
    }

    setOptions((prevState) => {
      return {
        ...prevState,
        branches: auth?.user?.branches || [],
      };
    });

    return () => {};
  }, [auth.user.branches]);

  useEffect(() => {
    const query = qs.parse(location.search, { ignoreQueryPrefix: true });

    (async () => {
      if (isEmpty(params?.id) && !isEmpty(search_state.branch?._id)) {
        setTimeout(() => {
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
        }, 300);
      }
    })();

    return () => {};
  }, [search_state.branch, search_state.payment_type]);

  useEffect(() => {
    const total_amount = state.total_amount;
    const payments = state.payments || [];
    const total_payment = round(
      sumBy(
        payments.filter(
          (o) => !isEmpty(o.payment_method) && !isEmpty(o.amount)
        ),
        (o) => parseFloat(o.amount || 0)
      )
    );

    const change = round(total_payment - total_amount);
    // console.log(total_amount, total_payment);

    setState((prevState) => ({
      ...prevState,
      change,
    }));

    return () => {};
  }, [state.total_amount, state.payments]);

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
        setState: (record) => {
          setState({
            ...record,
            payments: [...(record.payments || []), {}],
          });
        },
        setErrors,
        setRecords,
        url,
        date_fields,
      });
    }
    return () => {};
  }, []);

  const can_edit =
    isEmpty(state.status) || [OPEN].includes(state.status?.approval_status);

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
      <AccountFormModal
        setField={(account) => {
          setState((prevState) => ({
            ...prevState,
            account,
          }));
        }}
        ref={accountFormModal}
      />
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>{payment_type} Replacement Form</Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <div className="column">
          <Searchbar
            name="search_keyword"
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={
              hasAccess({
                auth,
                access: ACCESS_ADD,
                location,
              })
                ? () => {
                    setState({
                      ...initialValues,
                      date: moment(),
                      ...(payment_type === PAYMENT_TYPE_CHARGE && {
                        due_date: moment(),
                      }),

                      branch: auth.user?.branches?.[0] || null,
                    });
                    setItem(initialItemValues);
                    setRecords([]);
                  }
                : null
            }
          />
        </div>
      </div>

      {hasAccess({
        auth,
        access: ACCESS_ADVANCE_SEARCH,
        location,
      }) && (
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
                          label="Branch"
                          value={
                            search_state.branch &&
                            `${search_state.branch?.company?.name}-${search_state.branch?.name}`
                          }
                          onChange={(index) => {
                            const branch = auth.user?.branches?.[index] || null;
                            setSearchState((prevState) => ({
                              ...prevState,
                              branch,
                            }));
                          }}
                          formItemLayout={smallFormItemLayout}
                          data={(auth.user?.branches || []).map((o) => {
                            return {
                              ...o,
                              display_name: `${o.company?.name}-${o?.name}`,
                            };
                          })}
                          column="display_name"
                        />
                      </Col>
                      <Col span={8}>
                        <SelectFieldGroup
                          label="Account"
                          value={search_state.account?.name}
                          onFocus={() => {
                            onCustomerSearch({ value: "", setOptions });
                          }}
                          onSearch={(value) =>
                            onCustomerSearch({ value, setOptions })
                          }
                          onChange={(index) => {
                            const account = options.accounts?.[index] || null;
                            setSearchState((prevState) => ({
                              ...prevState,
                              account,
                            }));
                          }}
                          formItemLayout={smallFormItemLayout}
                          data={options.accounts}
                          column="name"
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
                          label="Item"
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
                      <Col span={8}>
                        <TextFieldGroup
                          label={transaction_counter.label}
                          name={transaction_counter.key}
                          formItemLayout={smallFormItemLayout}
                          value={search_state[transaction_counter.key]}
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
        </Row>
      )}

      <div style={{ background: "#fff", padding: 24 }}>
        <Row>
          <Col span={12}>
            <span className="module-title">
              {payment_type} Replacement Form
            </span>
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
                values: {
                  ...state,
                  payment_type,
                  payments: state.payments.filter((o) => {
                    return !isEmpty(o.payment_method) && !isEmpty(o.amount);
                  }),
                },
                auth,
                url,
                setErrors,
                setState,
                date_fields,
                setLoading,
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
                    error={errors.remarks}
                    formItemLayout={smallFormItemLayout}
                    readOnly
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    label="Branch Ref."
                    value={state.branch_reference}
                    formItemLayout={smallFormItemLayout}
                    readOnly
                  />
                </Col>
              </Row>
            )}

            <Row>
              <Col span={12}>
                <DatePickerFieldGroup
                  label="Date"
                  name="date"
                  value={state.date || null}
                  onChange={(value) => {
                    setState((prevState) => ({
                      ...prevState,
                      date: value,
                      ...(payment_type === PAYMENT_TYPE_CHARGE && {
                        due_date: value,
                      }),
                    }));
                  }}
                  error={errors.date}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              {/* {payment_type === PAYMENT_TYPE_CHARGE && (
                <Col span={12}>
                  <DatePickerFieldGroup
                    label="Due Date"
                    name="due_date"
                    value={state.due_date || null}
                    onChange={(value) => {
                      onChange({
                        key: "due_date",
                        value: value,
                        setState,
                      });
                    }}
                    error={errors.due_date}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
              )} */}
            </Row>

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  disabled={!isEmpty(state._id)}
                  label="Branch"
                  value={
                    state.branch &&
                    `${state.branch?.company?.name}-${state.branch?.name}`
                  }
                  onChange={(index) => {
                    const branch = auth.user?.branches?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      branch,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={(auth.user?.branches || []).map((o) => {
                    return {
                      ...o,
                      display_name: `${o.company?.name}-${o?.name}`,
                    };
                  })}
                  column="display_name"
                  error={errors.branch}
                />
              </Col>
              <Col span={12}>
                <SelectFieldGroup
                  disabled={(state.items || []).length > 0}
                  label="Account"
                  value={state.account?.name}
                  onFocus={() => {
                    onCustomerSearch({ value: "", setOptions });
                  }}
                  onSearch={(value) => onCustomerSearch({ value, setOptions })}
                  onChange={(index) => {
                    const account = options.accounts?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      account,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.accounts}
                  column="name"
                  error={errors.account}
                  onAddItem={() => accountFormModal.current.open()}
                />
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  readOnly
                  label="Address"
                  name="address"
                  value={state.account?.address}
                  error={errors.address}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  readOnly
                  label="TIN"
                  name="tin"
                  value={state.account?.tin}
                  error={errors.tin}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>

              <Col span={12}>
                <DatePickerFieldGroup
                  label="DR Date"
                  name="invoice_date"
                  value={state.invoice_date || null}
                  onChange={(value) => {
                    setState((prevState) => ({
                      ...prevState,
                      invoice_date: value,
                    }));
                  }}
                  error={errors.invoice_date}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  label="Reference"
                  name="reference"
                  value={state.reference}
                  error={errors.reference}
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
            {[undefined, null, OPEN].includes(
              state.status?.approval_status
            ) && (
              <ItemsNoPriceField
                item={item}
                setItem={setItem}
                state={state}
                setState={setState}
                items_key="items"
                options={options}
                setOptions={setOptions}
                errors={errors}
                initialItemValues={initialItemValues}
                has_discount={false}
                has_open_quantity={false}
                auth={auth}
              />
            )}
            <Table
              dataSource={addKeysToArray([
                ...state.items,
                {
                  footer: 1,
                  quantity: sumBy(state.items, (o) => round(o.quantity)),

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
                      setState: (record) => {
                        setState({
                          ...record,
                          payments: [...(record.payments || []), {}],
                        });
                      },
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
                  if (
                    hasAccess({
                      auth,
                      access: ACCESS_OPEN,
                      location,
                    })
                  ) {
                    edit({
                      record,
                      setState: (record) => {
                        setState({
                          ...record,
                          payments: [...(record.payments || []), {}],
                        });
                      },
                      setErrors,
                      setRecords,
                      url,
                      date_fields,
                    });
                  }
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
              pageSize: page_size,
            }}
          />
        )}
      </div>
    </Content>
  );
}
