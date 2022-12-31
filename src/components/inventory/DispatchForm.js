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
  PRICING_OPTION_OOT,
  PRICING_OPTION_WHOLESALE,
  STATUS_CLOSED,
} from "../../utils/constants";
import axios from "axios";
import { sumBy, uniq } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import classNames from "classnames";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { pricing_options } from "../../utils/Options";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/dispatches/";
const title = "Dispatch Form";
let controller;
const initialItemValues = {
  stock: null,
  case_quantity: null,
  quantity: null,
  case_price: null,
  price: null,
  amount: null,
};

const transaction_counter = {
  label: "DS #",
  key: "ds_no",
};

const date_fields = ["date"];

export default function DispatchForm({ navigate }) {
  const params = useParams();
  const [inventory_count, setInventoryCount] = useState(null);
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

  const initialValues = {
    _id: null,
    date: moment(),
    customer: null,
    remarks: "",
    items: [],
    pricing_option: PRICING_OPTION_WHOLESALE,

    gross_amount: 0,
    total_discount_amount: 0,
    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "DS #",
      dataIndex: "ds_no",
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
      title: "Location",
      dataIndex: ["customer", "location", "name"],
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
      title: "Bundle",
      dataIndex: ["bundle"],
      align: "center",
      width: 50,
    },
    {
      title: "Loading Status",
      dataIndex: ["loading_status"],
      width: 150,
      align: "center",
    },

    {
      title: "",
      key: "action",
      width: 50,
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
    if (!isEmpty(item.stock)) {
      //get inventory count
      console.log(controller);
      if (isEmpty(controller)) {
        console.log("Empty controller");
        controller = new AbortController();
      } else {
        console.log("aborting controller");
        controller.abort();
        controller = new AbortController();
      }
      axios
        .post(
          "/api/physical-counts/current-stock-balance",
          {
            stock: item.stock,
          },
          {
            signal: controller.signal,
          }
        )
        .then((response) => {
          setInventoryCount(response.data);
        })
        .catch((err) => {
          console.log(err);
        });
    }

    return () => {
      if (controller) controller.abort();
    };
  }, [item.stock]);

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
                        label="DS #"
                        name="ds_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.ds_no}
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
                  formItemLayout={smallFormItemLayout}
                  data={options.customers}
                  column="name"
                  error={errors.customer}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  label="Agent"
                  value={state.customer?.agent?.name}
                  error={errors.remarks}
                  disabled
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Location"
                  value={state.customer?.location?.name}
                  error={errors.location}
                  disabled
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <SimpleSelectFieldGroup
                  label="Pricing"
                  name="pricing_option"
                  value={state.pricing_option}
                  disabled={state.items.length > 0}
                  onChange={(value) => {
                    onChange({
                      key: "pricing_option",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors?.pricing_option}
                  formItemLayout={smallFormItemLayout}
                  options={pricing_options}
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
                <Col span={8}>
                  <div>
                    <SelectFieldGroup
                      key="1"
                      inputRef={stockField}
                      label="Item"
                      value={item.stock?.name}
                      onSearch={(value) =>
                        onStockSearch({ value, options, setOptions })
                      }
                      onChange={(index) => {
                        const stock = options.stocks?.[index] || null;
                        let price = stock?.wholesale_price;

                        if (state.pricing_option === PRICING_OPTION_OOT) {
                          price = stock?.oot_price;
                        } else if (
                          state.pricing_option === PRICING_OPTION_WHOLESALE
                        ) {
                          price = stock?.bodega_wholesale_price;
                        }

                        setItem({
                          ...item,
                          stock,
                          price,
                        });
                        quanttiyField.current.focus();
                      }}
                      error={errors.stock?.name}
                      formItemLayout={null}
                      data={options.stocks}
                      column="display_name"
                    />
                  </div>
                  {!isEmpty(inventory_count) && (
                    <div className="has-text-weight-bold">
                      Inventory Count: {inventory_count}
                    </div>
                  )}
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
                      setState((prevState) => ({
                        ...prevState,
                        items: [
                          ...prevState.items,
                          {
                            ...item,
                            quantity: !isEmpty(item.quantity)
                              ? parseFloat(item.quantity)
                              : 0,
                            case_quantity: !isEmpty(item.case_quantity)
                              ? parseFloat(item.case_quantity)
                              : 0,
                            price: !isEmpty(item.price)
                              ? parseFloat(item.price)
                              : 0,
                            case_price: !isEmpty(item.case_price)
                              ? parseFloat(item.case_price)
                              : 0,
                          },
                        ],
                      }));
                      setItem(initialItemValues);
                      setInventoryCount(null);
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
                axios
                  .get(`/api/dispatches/${state._id}/print`)
                  .catch((err) => console.log(err));
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
