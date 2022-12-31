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
  Row,
  Col,
  Input,
} from "antd";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
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
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import SupplierFormModal from "../modals/SupplierFormModal";
import {
  onSupplierSearch,
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
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
} from "../../utils/constants";
import { sumBy } from "lodash";
import { Link } from "react-router-dom";
import WarehouseFormModal from "../modals/WarehouseFormModal";

const { Content } = Layout;

const url = "/api/wastages/";
const title = "Wastage Form";

const initialValues = {
  _id: null,
  po_no: null,
  date: moment(),
  supplier: null,
  remarks: "",
  items: [],

  total_amount: 0,
  total_advance_payment: 0,
  total_creditable_advance_payment: 0,
  total_credit_advance_payment: 0,
};

const initialItemValues = {
  stock: null,
  case_quantity: null,
  quantity: null,
  case_price: null,
  price: null,
  amount: null,
  received_case_quantity: 0,
  received_quantity: 0,
};

const date_fields = ["date"];
const transaction_counter = {
  label: "PO #",
  key: "po_no",
};

export default function WastageForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [options, setOptions] = useState({
    warehouses: [],
    stocks: [],
  });

  const [state, setState] = useState(initialValues);

  const supplierFormModal = useRef(null);
  const warehouseFormModal = useRef(null);
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);
  const addItemButton = useRef(null);
  const stockField = useRef(null);

  const records_column = [
    {
      title: "WS #",
      dataIndex: "wastage_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Warehouse",
      dataIndex: ["warehouse", "name"],
    },

    {
      title: "Remarks",
      dataIndex: "remarks",
    },
    {
      title: "Total Cost",
      dataIndex: "total_amount",
      align: "right",
      width: 100,
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

  const items_column = [
    {
      title: "Item",
      dataIndex: ["stock", "name"],
    },

    {
      title: "SKU",
      dataIndex: ["stock", "sku"],
    },

    {
      title: "Qty",
      dataIndex: "case_quantity",
      align: "center",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 &&
          record.received_case_quantity <= 0 &&
          record.received_quantity <= 0 &&
          isEmpty(state.status) &&
          isEmpty(state.deleted) ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  value={record.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let items = [...state.items];
                      let item = items[index];
                      const quantity = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(quantity * item.price);

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
            ` ${numberFormat(record.quantity)}`
          )}
        </span>
      ),
    },
    {
      title: "Price",
      dataIndex: "case_price",
      align: "center",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 &&
          record.received_case_quantity <= 0 &&
          record.received_quantity <= 0 &&
          isEmpty(state.status) &&
          isEmpty(state.deleted) ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  value={record.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let items = [...state.items];
                      let item = items[index];
                      const price = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(item.quantity * price);

                      items[index] = {
                        ...items[index],
                        price,
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
            <span />
          )}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right",
      width: 100,
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) &&
            isEmpty(state.deleted) &&
            record.received_quantity <= 0 && (
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

  useEffect(() => {
    setState((prevState) => {
      const total_amount = sumBy(state.items, (o) => o.amount);

      return {
        ...prevState,
        total_amount,
      };
    });

    return () => {};
  }, [state.items]);

  useEffect(() => {
    const getLatestPrice = ({ stock, supplier }) => {
      if (item.stock) {
        axios
          .post("/api/products/latest-price", {
            stock,
          })
          .then((response) => {
            const case_price = response?.data?.case_price;
            const pieces_in_case = response?.data?.stock?.pieces_in_case;

            let price = response?.data?.price;

            if (isEmpty(price) && !isEmpty(pieces_in_case)) {
              price = round(case_price / pieces_in_case);
            }

            setItem((prev_items) => ({
              ...prev_items,
              price,
              case_price: response?.data?.case_price,
            }));
          });
      }
    };

    getLatestPrice({ stock: item.stock, supplier: state.supplier });
    return () => {};
  }, [item.stock]);

  const onClosePO = () => {
    const loading = message.loading("Processing...");
    axios
      .post("/api/purchase-orders/close-po", {
        purchase_order: state,
      })
      .then((response) => {
        loading();
        setState((prevState) => ({
          ...prevState,
          po_status: response.data.po_status,
        }));
      })
      .catch((err) => {
        loading();
        message.error("There was an error processing your request");
      });
  };

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

      <div style={{ background: "#fff", padding: 24 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onSubmit={(e) => {
              e.preventDefault();
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
              label="Warehouse"
              value={state.warehouse?.name}
              onSearch={(value) =>
                onWarehouseSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const warehouse = options.warehouses[index];

                setState((prevState) => ({
                  ...prevState,
                  warehouse,
                }));
              }}
              error={errors.warehouse}
              formItemLayout={formItemLayout}
              data={options.warehouses}
              column="name"
              onAddItem={() => warehouseFormModal.current.open()}
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

            {state.po_status && (
              <TextFieldGroup
                label="PO Status"
                name="status"
                value={state.po_status}
                formItemLayout={formItemLayout}
                readOnly
              />
            )}

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
                  Items
                </Divider>,
                <Row key="form" className="ant-form-vertical" gutter="4">
                  <Col span={6}>
                    <SelectFieldGroup
                      key="1"
                      inputRef={stockField}
                      label="Stock"
                      value={item.stock?.name}
                      onSearch={(value) =>
                        onStockSearch({ value, options, setOptions })
                      }
                      onChange={(index) => {
                        setItem({
                          ...item,
                          stock: options.stocks[index],
                        });
                        quanttiyField.current.focus();
                      }}
                      error={errors.stock?.name}
                      formItemLayout={null}
                      data={options.stocks}
                      column="name"
                    />
                  </Col>
                  {/* <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Case"
                      value={item.case_quantity}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          case_quantity: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.item && errors.item.case_quantity}
                      formItemLayout={null}
                      inputRef={caseQuantityField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        quanttiyField.current.focus();
                      }}
                    />
                  </Col> */}
                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          quantity: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.item && errors.item.quantity}
                      formItemLayout={null}
                      inputRef={quanttiyField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        priceField.current.focus();
                      }}
                    />
                  </Col>
                  {/* <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Case Cost"
                      value={item.case_price}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          case_price: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.item && errors.item.case_price}
                      formItemLayout={null}
                      inputRef={casePriceField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        priceField.current.focus();
                      }}
                    />
                  </Col> */}
                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Cost"
                      value={item.price}
                      onChange={(e) => {
                        setItem({
                          ...item,
                          price: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.item && errors.item.price}
                      formItemLayout={null}
                      inputRef={priceField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        amountField.current.focus();
                      }}
                    />
                  </Col>
                  <Col span={2}>
                    <TextFieldGroup
                      label="Amount"
                      value={item.amount}
                      readOnly
                      error={errors.item && errors.item.amount}
                      formItemLayout={null}
                      inputRef={amountField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        addItemButton.current.click();
                      }}
                    />
                  </Col>
                  <Col
                    span={2}
                    className="is-flex align-items-center add-button-height"
                  >
                    <input
                      type="button"
                      ref={addItemButton}
                      className="button is-primary is-small"
                      onClick={() => {
                        setState((prevState) => ({
                          ...prevState,
                          items: [
                            ...prevState.items,
                            {
                              ...item,
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
              ]}
            <Table
              dataSource={addKeysToArray([
                ...(state.items || []),
                {
                  footer: 1,

                  case_quantity: sumBy(state.items, (o) =>
                    round(o.case_quantity)
                  ),
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

            {isEmpty(state.status) && isEmpty(state.deleted) && (
              <div className="m-t-1">
                <Form.Item className="m-t-1">
                  <div className="field is-grouped">
                    <div className="control">
                      <button className="button is-small is-primary">
                        Save
                      </button>
                    </div>

                    {!isEmpty(state._id)
                      ? [
                          <Link
                            key="print-button"
                            to={`/print/wastages/${state._id}`}
                            target="_blank"
                            className="control"
                          >
                            <span className="button is-outlined is-link is-small">
                              <span className="icon is-small">
                                <i className="fas fa-print" />
                              </span>
                              <span>Print</span>
                            </span>
                          </Link>,
                        ]
                      : null}

                    {!isEmpty(state._id) && (
                      <span
                        className="button is-danger is-outlined is-small"
                        onClick={() => {
                          onDelete({
                            id: state._id,
                            url,
                            user: auth.user,
                          });
                          setState(initialValues);
                          setItem(initialItemValues);
                        }}
                      >
                        <span>Delete</span>
                        <span className="icon is-small">
                          <i className="fas fa-times"></i>
                        </span>
                      </span>
                    )}
                  </div>
                </Form.Item>
              </div>
            )}
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
