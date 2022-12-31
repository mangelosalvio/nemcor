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
  Space,
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
  onLocationSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import {
  CANCELLED,
  OPEN,
  STATUS_CLOSED,
  UNBUNDLED,
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
import BundleFormButtons from "../../commons/BundleFormButtons";
import { bundle_status_options } from "../../utils/Options";
import SplitBundleModal from "../modals/SplitBundleModal";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/dispatches/";
const title = "Bundling";

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

export default function BundlingForm({ navigate }) {
  const params = useParams();
  const [search, setSearch] = useState(true);
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

  const [search_state, setSearchState] = useState({
    period_covered: [moment(), moment()],
    approval_status: STATUS_CLOSED,
    bundle_status: UNBUNDLED,
  });

  const supplierFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);
  const splitModal = useRef(null);

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
      title: "Bundle Status",
      dataIndex: ["bundle_status"],
      align: "center",
    },
    /* {
      title: "Total Amount",
      dataIndex: "total_amount",
      align: "right",
      width: 150,
      render: (value) => <span>{numberFormat(value)}</span>,
    }, */

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
      render: (value, record) => value && `${record.stock?.sku} ${value}`,
    },

    {
      title: "Qty",
      dataIndex: "quantity",
      align: "right",
      width: 150,
      render: (value, record, index) => (
        <span>{numberFormat(record.quantity)}</span>
      ),
    },
    /*  {
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
    }, */
    {
      title: "Bundle",

      dataIndex: "bundle",
      align: "center",
      width: 80,
      render: (bundle, record, index) =>
        record.footer !== 1 && (
          <Input
            type="number"
            className="has-text-centered"
            step={1}
            value={bundle}
            onChange={(e) => {
              const items = [...state.items];
              items[index] = {
                ...items[index],
                bundle: e.target.value,
              };
              onChange({
                key: "items",
                value: items,
                setState,
              });
            }}
            onBlur={(e) => {
              const bundle = e.target.value;

              const items = [...state.items];
              items[index] = {
                ...items[index],
                bundle,
              };

              setState((prevState) => ({ ...prevState, items }));

              axios
                .post("/api/dispatches/bundle-item", {
                  _id: state._id,
                  items,
                })
                .then(() => {
                  message.success("Bundle updated");
                })
                .catch((err) => {
                  console.log(err);
                  message.error("There an error processing your request");
                });
            }}
          />
        ),
    },
    {
      title: "",
      width: 50,
      align: "center",
      render: (value, record, index) =>
        record.footer !== 1 && (
          <Space>
            <i
              onClick={() =>
                splitModal.current.open({
                  record,
                  index,
                })
              }
              className="fas fa-table-columns"
            ></i>
            {record.bundle > 0 && (
              <i
                class="fa-solid fa-print"
                onClick={() => {
                  axios
                    .get(
                      `/api/dispatches/${state._id}/print-bundles${
                        record.bundle ? `?bundle=${record.bundle}` : ""
                      }`
                    )
                    .catch((err) => console.log(err));
                }}
              ></i>
            )}
          </Space>
        ),
    },

    {
      title: "",
      key: "action",
      width: 50,
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            isEmpty(state.status) &&
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
      setSearch,
    });

    return () => {};
  }, []);

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
      <SplitBundleModal
        onSplit={(items, index) => {
          let _items = [...state.items];
          _items.splice(index, 1, ...items);
          console.log(_items);
          setState((prevState) => ({
            ...prevState,
            items: _items,
          }));
        }}
        ref={splitModal}
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
        <div className="column"></div>
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
                    <Col span={8}>
                      <SimpleSelectFieldGroup
                        label="Bundle Status"
                        name="bundle_status"
                        value={search_state.bundle_status}
                        onChange={(value) => {
                          onChange({
                            key: "bundle_status",
                            value: value,
                            setState: setSearchState,
                          });
                        }}
                        error={errors?.bundle_status}
                        formItemLayout={smallFormItemLayout}
                        options={bundle_status_options}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col span={8}>
                      <SelectFieldGroup
                        label="Location"
                        value={search_state.location?.name}
                        onSearch={(value) =>
                          onLocationSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const location = options.locations?.[index] || null;
                          setSearchState((prevState) => ({
                            ...prevState,
                            location,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.locations}
                        column="name"
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
                                setSearch,
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
                      setSearch,
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
        {!search ? (
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

            {/* {can_edit && [
              <Divider orientation="left" key="divider">
                Items
              </Divider>,
              <Row key="form" className="ant-form-vertical" gutter="4">
                <Col span={8}>
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
                      setItem({
                        ...item,
                        stock,
                        price: stock?.wholesale_price || "",
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
                      stockField.current.focus();
                    }}
                    value="Add"
                  />
                </Col>
              </Row>,
            ]} */}
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

            <BundleFormButtons
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
                      setSearch,
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
                  setSearch,
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
                  .get(`/api/dispatches/${state._id}/print-bundles`)
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
                  setSearch(false);
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
                  setSearch,
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
