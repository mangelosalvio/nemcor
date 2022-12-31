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
  onSearch,
  onDeleteItem,
  onChange,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import {
  onStockSearch,
  addKeysToArray,
  onWarehouseSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import axios from "axios";
import { Link } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import { sumBy } from "lodash";
import { APPROVED, USER_ADMINISTRATOR } from "../../utils/constants";

const { Content } = Layout;

const url = "/api/stock-transfers/";
const title = "Stock Transfer Form";

const initialItemValues = {
  stock: null,
  quantity: "",
  price: null,
  amount: null,
  description: null,
  total_released_quantity: 0,
  total_released_case_quantity: 0,
  total_received_quantity: 0,
  total_received_case_quantity: 0,

  approved_quantity: 0,
  approved_case_quantity: 0,
};

const date_fields = ["date"];

const transaction_counter = {
  label: "STR #",
  key: "stock_transfer_no",
};

const onGenerateStockRelease = ({
  state,
  user,
  history,
  setProcessing,
  processing,
}) => {
  if (processing) return;

  const form_data = {
    _id: state._id,
    user,
  };

  setProcessing(true);
  const loading = message.loading("Processing....");
  axios
    .put(`${url}stock-releasing`, form_data)
    .then((response) => {
      setProcessing(false);
      loading();
      history.push(`/stock-releasing/${response.data._id}`);
    })
    .catch((err) => {
      setProcessing(false);
      loading();
      message.error("There was an error processing your request");
    });
};

const onGenerateReceivingReport = ({
  state,
  user,
  history,
  setProcessing,
  processing,
}) => {
  if (processing) return;

  const form_data = {
    _id: state._id,
    user,
  };

  setProcessing(true);
  const loading = message.loading("Processing....");
  axios
    .put(`${url}stocks-receiving`, form_data)
    .then((response) => {
      setProcessing(false);
      loading();
      history.push(`/stocks-receiving/${response.data._id}`);
    })
    .catch((err) => {
      setProcessing(false);
      loading();
      message.error("There was an error processing your request");
    });
};

export default function StockTransferForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [options, setOptions] = useState({
    warehouses: [],
    stocks: [],
  });
  const initialValues = {
    _id: null,
    stock_transfer_no: null,
    date: moment(),
    from_warehouse: auth.user?.warehouse,
    to_warehouse: null,
    remarks: "",
    items: [],
    can_generate_stock_release: false,
    can_generate_receiving_report: false,
    total_amount: 0,
    printed: null,
  };

  const [state, setState] = useState(initialValues);

  const fromWarehouseFormModal = useRef(null);
  const toWarehouseFormModal = useRef(null);

  const quantityField = useRef(null);

  const addItemButton = useRef(null);
  const caseQuantityField = useRef(null);
  const quanttiyField = useRef(null);
  const casePriceField = useRef(null);
  const priceField = useRef(null);
  const amountField = useRef(null);

  const stockField = useRef(null);

  const records_column = [
    {
      title: "ST #",
      dataIndex: "stock_transfer_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "From Warehouse",
      dataIndex: ["from_warehouse", "name"],
    },
    {
      title: "To Warehouse",
      dataIndex: ["to_warehouse", "name"],
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
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
          record.total_released_case_quantity <= 0 &&
          record.total_released_quantity <= 0 &&
          record.total_received_case_quantity <= 0 &&
          record.total_received_quantity <= 0 &&
          isEmpty(state.status) &&
          isEmpty(state.deleted) ? (
            <Row gutter={8}>
              <Col span={24}>
                <Input
                  type="number"
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
            `${numberFormat(record.quantity)}`
          )}
        </span>
      ),
    },

    {
      title: "",
      key: "action",
      width: 100,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) &&
            isEmpty(state.deleted) &&
            record.total_received_quantity <= 0 &&
            record.total_received_case_quantity <= 0 &&
            record.total_released_quantity <= 0 &&
            record.total_released_case_quantity <= 0 && (
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
  const canGenerateStockRelease = ({ items }) => {
    for (let i = 0; i < items.length; i++) {
      if (
        items[i].approved_quantity > items[i].total_released_quantity ||
        items[i].approved_case_quantity > items[i].total_released_case_quantity
      ) {
        return true;
      }
    }

    return false;
  };

  const canGenerateReceivingReport = ({ items }) => {
    for (let i = 0; i < items.length; i++) {
      if (
        items[i].approved_quantity > items[i].total_received_quantity ||
        items[i].approved_case_quantity > items[i].total_received_case_quantity
      ) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    setItem((prevState) => ({
      ...prevState,
      approved_quantity: item.quantity,
      approved_case_quantity: item.case_quantity,
    }));

    return () => {};
  }, [item.case_quantity, item.quantity]);

  useEffect(() => {
    const can_generate_stock_release = canGenerateStockRelease({
      items: state.items,
    });

    const can_generate_receiving_report = canGenerateReceivingReport({
      items: state.items,
    });

    setState((prevState) => ({
      ...prevState,
      can_generate_stock_release,
      can_generate_receiving_report,
      total_amount: round(sumBy(state.items, (o) => o.amount || 0)),
      total_released_case_quantity: round(
        sumBy(state.items, (o) => o.total_released_case_quantity || 0)
      ),
      total_released_quantity: round(
        sumBy(state.items, (o) => o.total_released_quantity || 0)
      ),
    }));

    return () => {};
  }, [state.items]);

  return (
    <Content className="content-padding">
      <WarehouseFormModal
        setField={(from_warehouse) => {
          setState((prevState) => ({
            ...prevState,
            from_warehouse,
          }));
        }}
        ref={fromWarehouseFormModal}
      />
      <WarehouseFormModal
        setField={(to_warehouse) => {
          setState((prevState) => ({
            ...prevState,
            to_warehouse,
          }));
        }}
        ref={toWarehouseFormModal}
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
              label="From Warehouse"
              value={state.from_warehouse?.name}
              onSearch={(value) =>
                onWarehouseSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const warehouse = options.warehouses[index];

                setState((prevState) => ({
                  ...prevState,
                  from_warehouse: warehouse,
                }));
              }}
              error={errors.from_warehouse}
              formItemLayout={formItemLayout}
              data={options.warehouses}
              column="name"
              onAddItem={() => fromWarehouseFormModal.current.open()}
            />

            <SelectFieldGroup
              label="To Warehouse"
              value={state.to_warehouse?.name}
              onSearch={(value) =>
                onWarehouseSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const warehouse = options.warehouses[index];

                setState((prevState) => ({
                  ...prevState,
                  to_warehouse: warehouse,
                }));
              }}
              error={errors.to_warehouse}
              formItemLayout={formItemLayout}
              data={options.warehouses}
              column="name"
              onAddItem={() => toWarehouseFormModal.current.open()}
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
                              quantity:
                                !isEmpty(item.quantity) && !isNaN(item.quantity)
                                  ? parseFloat(item.quantity)
                                  : 0,
                              case_quantity:
                                !isEmpty(item.case_quantity) &&
                                !isNaN(item.case_quantity)
                                  ? parseFloat(item.case_quantity)
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
              ]}
            <Table
              dataSource={addKeysToArray(state.items)}
              columns={items_column}
              pagination={false}
            />

            {isEmpty(state.deleted) && (
              <div className="m-t-1">
                <Form.Item className="m-t-1">
                  <div className="field is-grouped">
                    {state.can_generate_receiving_report &&
                      state.can_generate_stock_release && (
                        <div className="control">
                          <button className="button is-small is-primary">
                            Save
                          </button>
                        </div>
                      )}
                    {!isEmpty(state._id)
                      ? [
                          state.status?.approval_status === APPROVED &&
                            state.total_released_case_quantity <= 0 &&
                            state.total_released_quantity <= 0 && (
                              <Link
                                key="prin-button"
                                to={`/print/stock-transfers/${state._id}`}
                                target="_blank"
                                className="control"
                              >
                                <span className="button is-outlined is-link is-small">
                                  <span className="icon is-small">
                                    <i className="fas fa-print" />
                                  </span>
                                  <span>Print</span>
                                </span>
                              </Link>
                            ),
                          state.can_generate_stock_release &&
                            state.status?.approval_status === APPROVED && (
                              <span
                                key="generate_sales_button"
                                className="button is-outlined control is-small"
                                disabled={processing}
                                onClick={() => {
                                  onGenerateStockRelease({
                                    state,
                                    user: auth.user,
                                    history,
                                    setProcessing,
                                    processing,
                                  });
                                }}
                              >
                                <span>Generate Stock Release Form</span>
                              </span>
                            ),

                          state.can_generate_receiving_report &&
                            state.status?.approval_status === APPROVED && (
                              <span
                                key="generate-receiving-report-button"
                                className="button is-outlined control is-small"
                                disabled={processing}
                                onClick={() => {
                                  onGenerateReceivingReport({
                                    state,
                                    user: auth.user,
                                    history,
                                    setProcessing,
                                    processing,
                                  });
                                }}
                              >
                                <span>Generate Receiving Report</span>
                              </span>
                            ),
                          state.can_generate_receiving_report &&
                            state.can_generate_stock_release && (
                              <span
                                key="delete-button"
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
                            ),
                        ]
                      : null}
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
