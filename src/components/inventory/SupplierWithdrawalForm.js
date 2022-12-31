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
  onAreaSearch,
  onPurchaseOrderSearch,
  onTankerSearch,
} from "../../utils/utilities";
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
  DELIVERY_TYPE_PICKUP,
  DELIVERY_TYPE_PICKUP_OWN_PICKUP,
  OPEN,
  STATUS_CLOSED,
  TERMS_15_DAYS,
  TERMS_30_DAYS,
  TERMS_COD,
  TERMS_M30,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { onCustomerSearch } from "../utils/utilities";
import {
  delivery_type_options,
  supplier_delivery_type_options,
} from "../../utils/Options";
import { TextField } from "@material-ui/core";
import filterId from "../../commons/filterId";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/supplier-withdrawals/";
const title = "Supplier Withdrawals";

const initialItemValues = {
  stock: null,
  quantity: "",
  price: "",
  freight: "",
  amount: "",
};

const transaction_counter = {
  label: "WW #",
  key: "ww_no",
};

const date_fields = ["date", "due_date"];

export default function SupplierWithdrawalForm({ navigate }) {
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

    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "WW #",
      dataIndex: "ww_no",
    },
    {
      title: "Company",
      dataIndex: ["company", "name"],
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },

    {
      title: "PO #",
      dataIndex: ["purchase_order", "po_no"],
      width: 50,
    },
    {
      title: "Delivery Type",
      dataIndex: ["purchase_order", "supplier_delivery_type"],
      width: 100,
    },

    {
      title: "Supplier",
      dataIndex: ["supplier", "name"],
    },
    {
      title: "Tanker",
      dataIndex: ["tanker", "plate_no"],
      width: 100,
    },
    // {
    //   title: "Depot",
    //   dataIndex: ["warehouse", "name"],
    // },

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
          (isEmpty(state.status) || state?.status?.approval_status === OPEN) &&
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
                      const freight = parseFloat(
                        quantity * (item.freight_per_unit || 0)
                      );
                      const amount = round(quantity * item.price + freight);

                      items[index] = {
                        ...items[index],
                        quantity,
                        amount,
                        freight,
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
      title: "UOM",
      width: 150,
      align: "center",
      dataIndex: ["unit_of_measure", "unit"],
    },
    {
      title: "Price",
      dataIndex: ["price"],
      align: "right",
      width: 150,
      render: (value) => value && numberFormat(value, 6),
    },
    {
      title: "Freight/Unit",
      dataIndex: ["freight_per_unit"],
      align: "right",
      width: 150,
    },
    {
      title: "Freight",
      dataIndex: ["freight"],
      align: "right",
      width: 150,
      render: (value) => value && numberFormat(value),
    },
    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      width: 150,
      render: (value) => value && numberFormat(value),
    },

    {
      title: "W/D",
      width: 150,
      align: "right",
      dataIndex: ["withdrawn"],
      render: (value) => numberFormat(value),
    },
    {
      title: "",
      key: "action",
      align: "center",
      width: 100,
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            (isEmpty(state.status) ||
              [OPEN].includes(state?.status?.approval_status)) &&
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
    setSearchState((prevState) => {
      return {
        ...prevState,
        user_department: department,
      };
    });

    return () => {};
  }, [auth.user]);

  //compute for due date
  useEffect(() => {
    if (state.date && state.supplier?.terms) {
      let due_date;
      if (state.supplier?.terms === TERMS_COD) {
        due_date = state.date;
      } else if (state.supplier?.terms === TERMS_30_DAYS) {
        due_date = moment(state.date).add({ days: 30 }).endOf("day");
      } else if (state.supplier?.terms === TERMS_15_DAYS) {
        due_date = moment(state.date).add({ days: 15 }).endOf("day");
      } else if (state.supplier?.terms === TERMS_M30) {
        due_date = moment(state.date).add({ month: 1 }).endOf("month");
      }
      setState((prevState) => ({
        ...prevState,
        due_date,
      }));
    }

    return () => {};
  }, [state.date, state.supplier?.terms]);

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
                        label="Supplier"
                        value={search_state.supplier?.name}
                        onSearch={(value) =>
                          onSupplierSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const supplier = options.suppliers?.[index] || null;
                          setSearchState((prevState) => ({
                            ...prevState,
                            supplier,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.suppliers}
                        column="name"
                      />
                    </Col>
                    <Col span={8}>
                      <TextFieldGroup
                        label="WW #"
                        name="ww_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.ww_no}
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
                        label="PO #"
                        name="po_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.po_no}
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
                    error={errors.remarks}
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
                    onChange({
                      key: "date",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
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
            </Row>

            <SelectFieldGroup
              label="PO #"
              value={state.purchase_order && `${state.purchase_order?.po_no}`}
              onSearch={(value) =>
                onPurchaseOrderSearch({
                  value,
                  setOptions,
                  filters: {
                    department: auth.user?.department,
                  },
                })
              }
              onChange={(index) => {
                const purchase_order = options.purchase_orders?.[index] || null;

                setState((prevState) => ({
                  ...prevState,
                  purchase_order,
                  ...(purchase_order?.supplier?._id && {
                    company: purchase_order.company,
                    supplier: purchase_order.supplier,
                    items: [
                      ...purchase_order.items.map((o) => {
                        const po_detail_id = o?._id;
                        const _o = filterId(o);

                        const balance = round(
                          o.quantity - (o.confirmed_quantity || 0)
                        );

                        return {
                          ..._o,
                          quantity: balance,
                          balance,
                          po_detail_id,
                        };
                      }),
                    ],
                  }),
                }));
              }}
              error={errors.warehouse}
              formItemLayout={formItemLayout}
              data={options.purchase_orders}
              column="display_name"
            />

            <SimpleSelectFieldGroup
              label="Delivery Type"
              name="supplier_delivery_type"
              value={state?.purchase_order?.supplier_delivery_type}
              disabled
              onChange={(value) => {
                onChange({
                  key: "supplier_delivery_type",
                  value: value,
                  setState,
                });
              }}
              error={errors?.supplier_delivery_type}
              formItemLayout={formItemLayout}
              options={supplier_delivery_type_options}
            />

            {state?.purchase_order?.supplier_delivery_type ===
              DELIVERY_TYPE_COMPANY_DELIVERED && (
              <SelectFieldGroup
                label="Warehouse/Depot"
                value={state.warehouse?.name}
                onSearch={(value) => onWarehouseSearch({ value, setOptions })}
                onChange={(index) => {
                  const warehouse = options.warehouses?.[index] || null;
                  setState((prevState) => ({
                    ...prevState,
                    warehouse,
                  }));
                }}
                error={errors.warehouse}
                formItemLayout={formItemLayout}
                data={options.warehouses}
                column="name"
              />
            )}

            {state?.purchase_order?.supplier_delivery_type ===
              DELIVERY_TYPE_PICKUP_OWN_PICKUP && (
              <Row>
                <Col span={24}>
                  <SelectFieldGroup
                    label="Tanker"
                    value={state.tanker?.plate_no}
                    onSearch={(value) => onTankerSearch({ value, setOptions })}
                    onChange={(index) => {
                      const tanker = options.tankers?.[index] || null;
                      setState((prevState) => ({
                        ...prevState,
                        tanker,
                      }));
                    }}
                    error={errors.tanker}
                    formItemLayout={formItemLayout}
                    data={options.tankers}
                    column="display_name"
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    disabled
                    label="Capacity"
                    name="capacity"
                    error={errors.capacity}
                    formItemLayout={smallFormItemLayout}
                    value={state.tanker?.capacity || ""}
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    disabled
                    label="Compartment"
                    name="compartment"
                    error={errors.compartment}
                    formItemLayout={smallFormItemLayout}
                    value={state.tanker?.compartment || ""}
                  />
                </Col>
              </Row>
            )}

            <SelectFieldGroup
              label="Company"
              disabled
              value={state.company?.name}
              formItemLayout={formItemLayout}
              data={options.companies}
              column="name"
            />

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  label="Supplier"
                  disabled
                  value={state.supplier?.name}
                  onSearch={(value) => onSupplierSearch({ value, setOptions })}
                  onChange={(index) => {
                    const supplier = options.suppliers?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      supplier,
                    }));
                  }}
                  error={errors.customer}
                  formItemLayout={smallFormItemLayout}
                  data={options.suppliers}
                  column="name"
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  disabled
                  label="Terms"
                  name="terms"
                  value={state.supplier?.terms || ""}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  disabled
                  label="Area"
                  name="area"
                  value={state.purchase_order?.area?.name || ""}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="DR #"
                  name="dr_no"
                  value={state.dr_no}
                  error={errors.dr_no}
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
                  label="DN #"
                  name="dn_no"
                  value={state.dn_no}
                  error={errors.dn_no}
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
            {(isEmpty(state.status) ||
              state.status?.approval_status === OPEN) &&
              false && (
                <ItemsField
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
                  has_freight={false}
                />
              )}

            <Table
              dataSource={addKeysToArray([
                ...state.items,
                {
                  footer: 1,
                  quantity: sumBy(state.items, (o) => round(o.quantity)),
                  withdrawn: sumBy(state.items, (o) => round(o.withdrawn)),
                  confirmed_quantity: sumBy(state.items, (o) =>
                    round(o.confirmed_quantity)
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
              onPrint={() => {
                window.open(`/print/supplier-withdrawals/${state._id}`, "_tab");
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
