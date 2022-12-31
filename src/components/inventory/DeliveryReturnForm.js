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
import FormButtons from "../../commons/FormButtons";
import SupplierFormModal from "../modals/SupplierFormModal";
import {
  onSupplierSearch,
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
  onCustomerSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import {
  CANCELLED,
  OPEN,
  PRICING_OPTION_WHOLESALE,
  STATUS_CLOSED,
} from "../../utils/constants";
import axios from "axios";
import { sumBy, uniq, uniqBy } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import classNames from "classnames";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { pricing_options, stock_status_options } from "../../utils/Options";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/delivery-returns/";
const title = "Delivery Return Form";

const initialItemValues = {
  stock: null,
  case_quantity: null,
  quantity: null,
  case_price: null,
  price: null,
  amount: null,
};

const transaction_counter = {
  label: "RET #",
  key: "dr_ret_no",
};

const date_fields = ["date"];

export default function DeliveryReturnForm({ navigate }) {
  const params = useParams();
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [page_size, setPageSize] = useState(10);
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
  const [loading, setLoading] = useState(false);

  const [search_state, setSearchState] = useState({});

  const supplierFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);
  const customerField = useRef(null);

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
      title: "RET #",
      dataIndex: "dr_ret_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Customer",
      dataIndex: ["items"],
      render: (items) => uniqBy(items.map((o) => o.customer?.name)).join(", "),
    },
    ,
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
      title: "Total Amount",
      dataIndex: "total_amount",
      align: "right",
      width: 150,
      render: (value) => <span>{numberFormat(value)}</span>,
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

  const items_column = [
    {
      title: "Customer",
      dataIndex: ["customer", "name"],
    },
    {
      title: "SKU",
      dataIndex: ["stock", "sku"],
    },
    {
      title: "Item",
      dataIndex: ["stock", "name"],
    },

    {
      title: "Qty",
      dataIndex: "quantity",
      align: "right",
      width: 150,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 && can_edit ? (
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
      title: "Price",
      dataIndex: ["price"],
      align: "right",
      width: 150,
      render: (value) => value && numberFormat(value),
    },
    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      width: 150,
      render: (value) => numberFormat(value),
    },

    {
      title: "Status",
      dataIndex: ["stock_status"],
      align: "center",
      width: 100,
      render: (stock_status, record, index) =>
        record.footer !== 1 && (
          <SimpleSelectFieldGroup
            name="stock_status"
            value={stock_status}
            onChange={(value) => {
              const _items = [...state.items];
              _items[index] = {
                ..._items[index],
                stock_status: value,
              };
              onChange({
                key: "items",
                value: _items,
                setState,
              });
            }}
            options={stock_status_options}
          />
        ),
    },

    {
      title: "",
      key: "action",
      width: 50,
      align: "center",
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 && can_edit && (
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
                        label="Customer"
                        value={search_state.customer?.name}
                        onSearch={(value) =>
                          onCustomerSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const customer = options.customers[index];
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
                        label="RET #"
                        name="dr_ret_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.dr_ret_no}
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
            <span className="module-title">
              {isEmpty(records) && (
                <i
                  className="fas fa-chevron-left title-back-button"
                  onClick={() => {
                    onSearch({
                      page: current_page,
                      page_size,
                      search_keyword,
                      url,
                      setRecords,
                      setTotalRecords,
                      setCurrentPage,
                      setErrors,
                      advance_search: search_state,
                    });
                  }}
                ></i>
              )}
              {title}
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

            <Row>
              <Col span={12}>
                <SelectFieldGroup
                  label="Warehouse"
                  value={state.warehouse?.name}
                  onSearch={(value) => onWarehouseSearch({ value, setOptions })}
                  onChange={(index) => {
                    const warehouse = options.warehouses?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      warehouse,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.warehouses}
                  column="name"
                  error={errors.warehouse}
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
            {state.status?.approval_status && (
              <Row>
                <Col span={12}>
                  <TextFieldGroup
                    key="status"
                    disabled={true}
                    label="Status"
                    name="status"
                    value={`${state.status.approval_status} / ${
                      state.status.user.name
                    } / ${moment(state.status.datetime).format(
                      "MM/DD/YY hh:mm A"
                    )}`}
                    formItemLayout={smallFormItemLayout}
                    readOnly
                  />
                </Col>
                <Col span={12}>
                  <TextFieldGroup
                    key="created-by"
                    disabled={true}
                    label="Created By"
                    value={`${state.created_by.name} / ${moment(
                      state.created_at
                    ).format("MM/DD/YY hh:mm A")}`}
                    formItemLayout={smallFormItemLayout}
                    readOnly
                  />
                </Col>
              </Row>
            )}

            {state.deleted && state.deleted.date && (
              <TextFieldGroup
                label="Voided By"
                name="status"
                value={`${state.deleted?.user?.name} / ${moment(
                  state.deleted.date
                ).format("MM/DD/YY hh:mm A")}`}
                formItemLayout={formItemLayout}
                readOnly
              />
            )}

            {can_edit && [
              <Divider orientation="left" key="divider">
                Items
              </Divider>,
              <Row key="form" className="ant-form-vertical" gutter="4">
                <Col span={24}>
                  <Row gutter={4}>
                    <Col span={6}>
                      <SelectFieldGroup
                        inputRef={customerField}
                        label="Customer"
                        value={item.customer?.name}
                        onSearch={(value) =>
                          onCustomerSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const customer = options.customers?.[index] || null;
                          setItem({
                            ...item,
                            customer,
                          });
                          stockField.current.focus();
                        }}
                        error={errors.customer?.name}
                        formItemLayout={null}
                        data={options.customers}
                        column="display_name"
                      />
                    </Col>
                    <Col span={6}>
                      <SimpleSelectFieldGroup
                        label="Pricing"
                        name="pricing_option"
                        value={item.pricing_option}
                        onChange={(value) => {
                          onChange({
                            key: "pricing_option",
                            value: value,
                            setState: setItem,
                          });
                        }}
                        formItemLayout={smallFormItemLayout}
                        options={pricing_options}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={8}>
                  <SelectFieldGroup
                    disabled={
                      isEmpty(item.customer?._id) ||
                      isEmpty(item.pricing_option)
                    }
                    inputRef={stockField}
                    label="Item"
                    value={item.stock?.name}
                    onSearch={(value) =>
                      onStockSearch({ value, options, setOptions })
                    }
                    onChange={(index) => {
                      const stock = options.stocks?.[index] || null;
                      setItem({
                        ...item,
                        stock,
                        price:
                          item.pricing_option === PRICING_OPTION_WHOLESALE
                            ? stock?.bodega_wholesale_price
                            : stock?.oot_price,
                      });
                      quanttiyField.current.focus();
                    }}
                    error={errors.stock?.name}
                    formItemLayout={null}
                    data={options.stocks}
                    column="display_name"
                  />
                </Col>
                <Col span={3}>
                  <TextFieldGroup
                    type="number"
                    label="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      setItem({
                        ...item,
                        quantity: e.target.value,
                      });
                    }}
                    error={errors.quantity}
                    formItemLayout={null}
                    inputRef={quanttiyField}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      addItemButton.current.click();
                    }}
                  />
                </Col>
                <Col span={3}>
                  <TextFieldGroup
                    type="number"
                    label="Price"
                    value={item.price}
                    readOnly
                    inputRef={priceField}
                    error={errors.price}
                    formItemLayout={null}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      addItemButton.current.click();
                    }}
                  />
                </Col>
                <Col span={3}>
                  <TextFieldGroup
                    type="number"
                    label="Amount"
                    value={item.amount}
                    error={errors.item && errors.item.quantity}
                    formItemLayout={null}
                    readOnly
                    onPressEnter={(e) => {
                      e.preventDefault();
                      addItemButton.current.click();
                    }}
                  />
                </Col>

                <Col
                  span={2}
                  className="is-flex pad-top-button add-button-height"
                >
                  <input
                    type="button"
                    ref={addItemButton}
                    className="button is-primary "
                    onClick={() => {
                      if (isEmpty(item.customer)) {
                        return message.error("Customer is required");
                      }
                      if (isEmpty(item.stock)) {
                        return message.error("Item is required");
                      }
                      if (isEmpty(item.quantity)) {
                        return message.error("Quantity is required");
                      }

                      setState((prevState) => ({
                        ...prevState,
                        items: [
                          ...prevState.items,
                          {
                            ...item,
                            stock_status: "Good",
                            quantity: !isEmpty(item.quantity)
                              ? parseFloat(item.quantity)
                              : 0,
                            price: !isEmpty(item.price)
                              ? parseFloat(item.price)
                              : 0,
                          },
                        ],
                      }));
                      const _values = {
                        ...initialItemValues,
                        customer: item.customer,
                      };

                      setItem(_values);
                      stockField.current.focus();
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
              onPrint={() => {
                window.open(`/print/delivery-returns/${state._id}`, "_tab");
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
