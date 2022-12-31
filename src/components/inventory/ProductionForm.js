import React, { useState, useRef, useEffect } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Input,
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  message,
  Row,
  Col,
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
import numberFormatInt from "../../utils/numberFormatInt";

const { Content } = Layout;

const url = "/api/production/";
const title = "Production Form";

const initialValues = {
  _id: null,
  po_no: null,
  date: moment(),
  supplier: null,
  remarks: "",
  consumed_items: [],
  produced_items: [],

  total_consumed_amount: 0,
  total_produced_amount: 0,
};

const initialItemValues = {
  stock: null,
  case_quantity: null,
  quantity: null,
  case_price: null,
  price: null,
  amount: null,
};

const date_fields = ["date"];
const transaction_counter = {
  label: "PROD #",
  key: "production_no",
};

export default function ProductionForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);

  const [consumed_item, setConsumedItem] = useState(initialItemValues);

  const [produced_item, setProducedItem] = useState(initialItemValues);

  const [options, setOptions] = useState({
    warehouses: [],
    stocks: [],
  });

  const [state, setState] = useState(initialValues);

  const warehouseFormModal = useRef(null);

  const producedCaseQuantityField = useRef(null);
  const producedQuanttiyField = useRef(null);
  const producedCasePriceField = useRef(null);
  const producedPriceField = useRef(null);
  const producedAmountField = useRef(null);

  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);

  const producedAddItemButton = useRef(null);
  const addItemButton = useRef(null);

  const producedStockField = useRef(null);
  const stockField = useRef(null);

  const records_column = [
    {
      title: "Prod #",
      dataIndex: "production_no",
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
      title: "Total Consumed Amount",
      dataIndex: "total_consumed_amount",
      align: "right",
      width: 100,
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Total Produced Amount",
      dataIndex: "total_produced_amount",
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

  const consumed_items_column = [
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
          {record.footer !== 1 ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  value={record.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let consumed_items = [...state.consumed_items];
                      let item = consumed_items[index];
                      const quantity = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(quantity * item.price);

                      consumed_items[index] = {
                        ...consumed_items[index],
                        quantity,
                        amount,
                      };

                      return {
                        ...prevState,
                        consumed_items,
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
      dataIndex: "case_price",
      align: "center",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 && (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  value={record.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let consumed_items = [...state.consumed_items];
                      let item = consumed_items[index];
                      const price = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(item.quantity * price);

                      consumed_items[index] = {
                        ...consumed_items[index],
                        price,
                        amount,
                      };

                      return {
                        ...prevState,
                        consumed_items,
                      };
                    });
                  }}
                  align="right"
                />
              </Col>
            </Row>
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
            record.footer !== 1 && (
              <span
                onClick={() =>
                  onDeleteItem({
                    field: "consumed_items",
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

  const produced_items_column = [
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
          {record.footer !== 1 ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  value={record.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let produced_items = [...state.produced_items];
                      let item = produced_items[index];
                      const quantity = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(quantity * item.price);

                      produced_items[index] = {
                        ...produced_items[index],
                        quantity,
                        amount,
                      };

                      return {
                        ...prevState,
                        produced_items,
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
      dataIndex: "case_price",
      align: "center",
      width: 200,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 && (
            <Row gutter={8}>
              <Col span={12}>
                <Input
                  value={record.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setState((prevState) => {
                      let produced_items = [...state.produced_items];
                      let item = produced_items[index];
                      const price = value;
                      const amount =
                        round(item.case_quantity * item.case_price) +
                        round(item.quantity * price);

                      produced_items[index] = {
                        ...produced_items[index],
                        price,
                        amount,
                      };

                      return {
                        ...prevState,
                        produced_items,
                      };
                    });
                  }}
                  align="right"
                />
              </Col>
            </Row>
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
            record.footer !== 1 && (
              <span
                onClick={() =>
                  onDeleteItem({
                    field: "produced_items",
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
      round(
        round(produced_item.case_quantity) * round(produced_item.case_price)
      ) + round(round(produced_item.quantity) * round(produced_item.price))
    );

    setProducedItem((prevState) => {
      return {
        ...prevState,
        amount,
      };
    });

    return () => {};
  }, [
    produced_item.case_quantity,
    produced_item.quantity,
    produced_item.case_price,
    produced_item.price,
  ]);

  useEffect(() => {
    const amount = round(
      round(
        round(consumed_item.case_quantity) * round(consumed_item.case_price)
      ) + round(round(consumed_item.quantity) * round(consumed_item.price))
    );

    setConsumedItem((prevState) => {
      return {
        ...prevState,
        amount,
      };
    });

    return () => {};
  }, [
    consumed_item.case_quantity,
    consumed_item.quantity,
    consumed_item.case_price,
    consumed_item.price,
  ]);

  useEffect(() => {
    setState((prevState) => {
      const total_consumed_amount = sumBy(
        state.consumed_items,
        (o) => o.amount
      );
      const total_produced_amount = sumBy(
        state.produced_items,
        (o) => o.amount
      );

      return {
        ...prevState,
        total_consumed_amount,
        total_produced_amount,
      };
    });

    return () => {};
  }, [state.consumed_items, state.produced_items]);

  useEffect(() => {
    const getLatestPrice = ({ stock }) => {
      if (consumed_item.stock) {
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

            setConsumedItem((prev_items) => ({
              ...prev_items,
              price,
              case_price: response?.data?.case_price,
            }));
          });
      }
    };

    getLatestPrice({ stock: consumed_item.stock });
    return () => {};
  }, [consumed_item.stock]);

  useEffect(() => {
    const getLatestProducedPrice = ({ stock }) => {
      if (produced_item.stock) {
        axios
          .post("/api/products/latest-production-price", {
            stock,
          })
          .then((response) => {
            setProducedItem((prev_items) => ({
              ...prev_items,
              price: response?.data?.price,
              case_price: response?.data?.case_price,
            }));
          });
      }
    };

    getLatestProducedPrice({ stock: produced_item.stock });
    return () => {};
  }, [produced_item.stock]);

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
              setConsumedItem(initialItemValues);
              setProducedItem(initialItemValues);
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
                  Consumed Items
                </Divider>,
                <Row key="form" className="ant-form-vertical" gutter="4">
                  <Col span={6}>
                    <SelectFieldGroup
                      key="1"
                      inputRef={stockField}
                      label="Stock"
                      value={consumed_item.stock?.name}
                      onSearch={(value) =>
                        onStockSearch({ value, options, setOptions })
                      }
                      onChange={(index) => {
                        setConsumedItem({
                          ...consumed_item,
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
                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Qty"
                      value={consumed_item.quantity}
                      onChange={(e) => {
                        setConsumedItem({
                          ...consumed_item,
                          quantity: parseFloat(e.target.value),
                        });
                      }}
                      error={
                        errors.consumed_item && errors.consumed_item.quantity
                      }
                      formItemLayout={null}
                      inputRef={quanttiyField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        priceField.current.focus();
                      }}
                    />
                  </Col>
                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Cost"
                      value={consumed_item.price}
                      onChange={(e) => {
                        setConsumedItem({
                          ...consumed_item,
                          price: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.consumed_item && errors.consumed_item.price}
                      formItemLayout={null}
                      inputRef={priceField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        addItemButton.current.click();
                      }}
                    />
                  </Col>
                  <Col span={2}>
                    <TextFieldGroup
                      label="Amount"
                      value={consumed_item.amount}
                      readOnly
                      error={
                        errors.consumed_item && errors.consumed_item.amount
                      }
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
                          consumed_items: [
                            ...prevState.consumed_items,
                            {
                              ...consumed_item,
                              quantity: !isEmpty(consumed_item.quantity)
                                ? parseFloat(consumed_item.quantity)
                                : 0,
                              case_quantity: !isEmpty(
                                consumed_item.case_quantity
                              )
                                ? parseFloat(consumed_item.case_quantity)
                                : 0,
                              price: !isEmpty(consumed_item.price)
                                ? parseFloat(consumed_item.price)
                                : 0,
                              case_price: !isEmpty(consumed_item.case_price)
                                ? parseFloat(consumed_item.case_price)
                                : 0,
                            },
                          ],
                        }));
                        setConsumedItem(initialItemValues);
                        stockField.current.focus();
                      }}
                      value="Add"
                    />
                  </Col>
                </Row>,
              ]}
            <Table
              dataSource={addKeysToArray([
                ...(state.consumed_items || []),
                {
                  footer: 1,

                  case_quantity: sumBy(state.consumed_items, (o) =>
                    round(o.case_quantity)
                  ),
                  quantity: sumBy(state.consumed_items, (o) =>
                    round(o.quantity)
                  ),

                  amount: sumBy(state.consumed_items, (o) => round(o.amount)),
                },
              ])}
              columns={consumed_items_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />

            {isEmpty(state.status) &&
              isEmpty(state.deleted) && [
                <Divider orientation="left" key="divider">
                  Produced Items
                </Divider>,
                <Row key="form" className="ant-form-vertical" gutter="4">
                  <Col span={6}>
                    <SelectFieldGroup
                      key="1"
                      inputRef={producedStockField}
                      label="Stock"
                      value={produced_item.stock?.name}
                      onSearch={(value) =>
                        onStockSearch({ value, options, setOptions })
                      }
                      onChange={(index) => {
                        // compute for # of cases and # of pieces
                        const stock = options.stocks[index];

                        let produced_pieces;
                        if (state.consumed_items.length === 1) {
                          const {
                            quantity,
                            case_quantity,
                            stock: consumed_stock,
                          } = state.consumed_items[0];

                          const unit_weight = consumed_stock.unit_weight || 0;
                          const pieces_in_case =
                            consumed_stock.pieces_in_case || 0;

                          const total_unit_weight = round(
                            (case_quantity * pieces_in_case + quantity) *
                              unit_weight
                          );

                          produced_pieces = round(
                            total_unit_weight / stock.unit_weight
                          );

                          //console.log(total_unit_weight, stock.unit_weight);
                        }

                        setProducedItem({
                          ...produced_item,
                          stock,
                          quantity: produced_pieces,
                        });
                        producedQuanttiyField.current.focus();
                      }}
                      error={errors.stock?.name}
                      formItemLayout={null}
                      data={options.stocks}
                      column="name"
                    />
                  </Col>

                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Qty"
                      value={produced_item.quantity}
                      onChange={(e) => {
                        setProducedItem({
                          ...produced_item,
                          quantity: parseFloat(e.target.value),
                        });
                      }}
                      error={
                        errors.produced_item && errors.produced_item.quantity
                      }
                      formItemLayout={null}
                      inputRef={producedQuanttiyField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        producedPriceField.current.focus();
                      }}
                    />
                  </Col>
                  <Col span={2}>
                    <TextFieldGroup
                      type="number"
                      label="Cost"
                      value={produced_item.price}
                      onChange={(e) => {
                        setProducedItem({
                          ...produced_item,
                          price: parseFloat(e.target.value),
                        });
                      }}
                      error={errors.produced_item && errors.produced_item.price}
                      formItemLayout={null}
                      inputRef={producedPriceField}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        producedAddItemButton.current.click();
                      }}
                    />
                  </Col>
                  <Col span={2}>
                    <TextFieldGroup
                      label="Amount"
                      value={produced_item.amount}
                      readOnly
                      error={
                        errors.produced_item && errors.produced_item.amount
                      }
                      formItemLayout={null}
                      inputRef={producedAmountField}
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
                      ref={producedAddItemButton}
                      className="button is-primary is-small"
                      onClick={() => {
                        setState((prevState) => ({
                          ...prevState,
                          produced_items: [
                            ...prevState.produced_items,
                            {
                              ...produced_item,
                              quantity: !isEmpty(produced_item.quantity)
                                ? parseFloat(produced_item.quantity)
                                : 0,
                              case_quantity: !isEmpty(
                                produced_item.case_quantity
                              )
                                ? parseFloat(produced_item.case_quantity)
                                : 0,
                              price: !isEmpty(produced_item.price)
                                ? parseFloat(produced_item.price)
                                : 0,
                              case_price: !isEmpty(produced_item.case_price)
                                ? parseFloat(produced_item.case_price)
                                : 0,
                            },
                          ],
                        }));
                        setProducedItem(initialItemValues);
                        producedStockField.current.focus();
                      }}
                      value="Add"
                    />
                  </Col>
                </Row>,
              ]}
            <Table
              dataSource={addKeysToArray([
                ...(state.produced_items || []),
                {
                  footer: 1,

                  case_quantity: sumBy(state.produced_items, (o) =>
                    round(o.case_quantity)
                  ),
                  quantity: sumBy(state.produced_items, (o) =>
                    round(o.quantity)
                  ),

                  amount: sumBy(state.produced_items, (o) => round(o.amount)),
                },
              ])}
              columns={produced_items_column}
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
                            to={`/print/production/${state._id}`}
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
                          setConsumedItem(initialItemValues);
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
