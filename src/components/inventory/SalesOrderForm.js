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
  onCompanySearch,
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
  DELIVERY_TYPE_PICKUP_BY_CUSTOMER,
  DELIVERY_TYPE_PICKUP_DEPOT,
  DELIVERY_TYPE_PICKUP_TANK_FARM,
  OPEN,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { onCustomerSearch } from "../utils/utilities";
import { delivery_type_options } from "../../utils/Options";
import { computeTotalAmount } from "../../utils/computations";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/sales-orders/";
const title = "Sales Order Form";

const initialItemValues = {
  stock: null,
  quantity: "",
  price: "",
  freight: "",
  amount: "",
  open_quantity: false,
};

const transaction_counter = {
  label: "SO #",
  key: "so_no",
};

const date_fields = ["date", "date_needed"];

export default function SalesOrderForm({ navigate }) {
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
      title: "SO #",
      dataIndex: "so_no",
    },
    {
      title: "Dept.",
      dataIndex: ["department", "name"],
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
      title: "Date Needed",
      dataIndex: "date_needed",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Customer",
      dataIndex: ["customer", "name"],
    },
    {
      title: "DR Type",
      dataIndex: ["delivery_type"],
    },

    /*{
      title: "PO#",
      dataIndex: ["purchase_order", "po_no"],
    },
    {
      title: "Supplier",
      dataIndex: ["supplier"],
      render: (value, record) => (
        <span>
          {record.customer?.name}
          {record.supplier?.name}
        </span>
      ),
    }, */
    /* {
      title: "Remarks",
      dataIndex: "remarks",
    }, */

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
                        label="Customer"
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
                        label="SO#"
                        name="so_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.so_no}
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
                  label="Date Needed"
                  name="date_needed"
                  value={state.date_needed || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_needed",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_needed}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>

            <SelectFieldGroup
              label="Company"
              value={state.company?.name}
              onSearch={(value) => onCompanySearch({ value, setOptions })}
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

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  label="Customer"
                  value={state.customer?.name}
                  onSearch={(value) => onCustomerSearch({ value, setOptions })}
                  onChange={(index) => {
                    const customer = options.customers?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      customer,
                    }));
                  }}
                  error={errors.customer}
                  formItemLayout={smallFormItemLayout}
                  data={options.customers}
                  column="name"
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  disabled
                  label="Terms in days"
                  name="terms"
                  value={state.customer?.terms}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  disabled
                  label="Address"
                  name="address"
                  value={state.customer?.address || ""}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <SelectFieldGroup
                  label="Delivery Area"
                  value={state.delivery_area?.name}
                  onChange={(index) => {
                    const area = state.customer?.areas?.[index] || null;
                    if (area) {
                      setState((prevState) => ({
                        ...prevState,
                        delivery_area: area,
                      }));
                    }
                  }}
                  error={errors.area}
                  formItemLayout={smallFormItemLayout}
                  data={state?.customer?.areas || []}
                  column="name"
                />
              </Col>
            </Row>

            <SimpleSelectFieldGroup
              label="Delivery Type"
              name="delivery_type"
              value={state.delivery_type}
              onChange={(value) => {
                onChange({
                  key: "delivery_type",
                  value: value,
                  setState,
                });
              }}
              error={errors?.delivery_type}
              formItemLayout={formItemLayout}
              options={delivery_type_options}
            />

            {state.delivery_type === DELIVERY_TYPE_PICKUP_TANK_FARM && (
              <SelectFieldGroup
                label="Tank Farm"
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

            {[
              DELIVERY_TYPE_COMPANY_DELIVERED,
              DELIVERY_TYPE_PICKUP_DEPOT,
            ].includes(state.delivery_type) && (
              <Row>
                <Col span={12}>
                  <TextFieldGroup
                    type="number"
                    step={1}
                    label="PO No."
                    name="po_no"
                    error={errors.po}
                    value={state.po_no}
                    help="Press enter to search for PO #/ Supplier"
                    onChange={(e) => {
                      onChange({
                        key: e.target.name,
                        value: e.target.value,
                        setState,
                      });
                    }}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      axios
                        .post(`/api/purchase-orders/${state.po_no}/po-no`, {
                          department: auth.user?.department,
                        })
                        .then((response) => {
                          if (response.data) {
                            setState((prevState) => {
                              return {
                                ...prevState,
                                purchase_order: { ...response.data },
                                items: [
                                  ...response.data.items.map((o) => {
                                    delete o.price;
                                    delete o.amount;
                                    return {
                                      ...o,
                                    };
                                  }),
                                ],
                              };
                            });
                          }
                        })
                        .catch((err) => console.log(err));
                    }}
                    formItemLayout={smallFormItemLayout}
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    disabled
                    label="Supplier"
                    name="supplier"
                    value={state.purchase_order?.supplier?.name || ""}
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
            {(isEmpty(state.status) ||
              state.status?.approval_status === OPEN) && (
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
              />
            )}

            <Table
              dataSource={addKeysToArray([
                ...state.items,
                {
                  footer: 1,
                  quantity: sumBy(state.items, (o) => round(o.quantity)),
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
