import React, { useState, useRef, useEffect, useCallback } from "react";
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
  onTankerSearch,
  onSupplierWithdrawalSearch,
  onTankerWithdrawalSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { sumBy, uniq, uniqBy } from "lodash";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import { Link, useMatch, useParams } from "react-router-dom";
import numberFormatInt from "../../utils/numberFormatInt";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import validator from "validator";
import FormButtons from "../../commons/FormButtons";
import classNames from "classnames";
import {
  CANCELLED,
  OPEN,
  SOURCE_DEPOT,
  SOURCE_SUPPLIER,
  SOURCE_SUPPLIER_WITHDRAWALS,
  SOURCE_TANKER_SCHEDULING,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { onCustomerSearch } from "../utils/utilities";
import {
  delivery_type_options,
  source_return_options,
  source_withdrawal_options,
} from "../../utils/Options";
import { computeTotalAmount } from "../../utils/computations";
import confirm from "antd/lib/modal/confirm";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/warehouse-returns/";
const title = "Warehouse Return Form";

const initialItemValues = {
  stock: null,
  quantity: "",
  price: "",
  freight: "",
  amount: "",
};

const transaction_counter = {
  label: "WR #",
  key: "wr_no",
};

const date_fields = ["date"];

export default function WarehouseReturnForm({ navigate }) {
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
  const didMount = useRef(false);

  const initialValues = {
    _id: null,
    tw_no: "",
    tanker: null,
    date: moment(),
    sales_orders: [],
    remarks: "",
    items: [],
    source_tankers: [],

    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "WR #",
      dataIndex: "wr_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },

    {
      title: "Warehouse/Depot",
      dataIndex: ["warehouse", "name"],
    },
    {
      title: "Tanker",
      dataIndex: ["tanker", "plate_no"],
    },
    {
      title: "Source",
      dataIndex: ["source"],
    },

    {
      title: "Items",
      dataIndex: "items",
      width: 350,
      render: (items) =>
        (items || [])
          .slice(0, 4)
          .map(
            (o) =>
              `${o?.stock?.name} - ${o.quantity} ${o.unit_of_measure?.unit}`
          )
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
      title: "TS #",
      dataIndex: ["tw_no"],
      width: 80,
    },
    {
      title: "WW #",
      dataIndex: ["ww_no"],
      width: 80,
    },
    {
      title: "Supplier",
      dataIndex: ["supplier", "name"],
    },
    {
      title: "Item",
      dataIndex: ["stock", "name"],
    },

    {
      title: "Qty",
      dataIndex: ["quantity"],
      align: "right",
      width: 200,
      render: (value, record, index) =>
        record.footer !== 1 &&
        (isEmpty(state.status?.approval_status) ||
          [state.status?.approval_status].includes(OPEN)) ? (
          <Input
            value={value}
            className="has-text-right"
            onChange={(e) => {
              const quantity = e.target.value;

              const items = [...state.items];
              items[index] = {
                ...items[index],
                quantity,
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
      title: "",
      key: "action",
      align: "center",
      width: 100,
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            (isEmpty(state.status) ||
              state?.status?.approval_status === OPEN) &&
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

  const onSearchSalesOrders = useCallback(({ period_covered, setErrors }) => {
    axios
      .post("/api/sales-orders/for-bundling", {
        period_covered,
      })
      .then((response) => {
        if (response.data) {
          setState((prevState) => ({
            ...prevState,
            sales_orders: response.data,
          }));
          setErrors({});
        }
      })
      .catch((err) => {
        console.log(err);
        setErrors({ ...err?.response?.data });
        message.error("There was an error processing your request.");
      });
  }, []);

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

  useEffect(() => {
    if (params?.id) {
      didMount.current = false;
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
    // Return early, if this is the first render:
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    //save transaction on every add item
    // onSubmit({
    //   values: state,
    //   auth,
    //   url,
    //   setErrors,
    //   setState,
    //   date_fields,
    //   set_state_on_save: false,
    // });
    return () => {};
  }, [state.items]);

  useEffect(() => {
    if (state.source === SOURCE_SUPPLIER_WITHDRAWALS && state.tanker?._id) {
      onSupplierWithdrawalSearch({
        value: "",
        tanker: state.tanker,
        setOptions,
        filters: {
          department: auth.user?.department,
        },
      });
    } else if (state.source === SOURCE_TANKER_SCHEDULING && state.tanker?._id) {
      onTankerWithdrawalSearch({
        value: "",
        tanker: state.tanker,
        setOptions,
        filters: {
          department: auth.user?.department,
        },
      });
    }

    return () => {};
  }, [state.source, state.tanker]);

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
              didMount.current = false;
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
                        label="RR #"
                        name="rr_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.rr_no}
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
                set_state_on_save: false,
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
                <SimpleSelectFieldGroup
                  label="Source"
                  name="source"
                  value={state.source}
                  onChange={(value) => {
                    setState((prevState) => {
                      return {
                        ...prevState,
                        source: value,
                        ...(value === SOURCE_TANKER_SCHEDULING && {
                          supplier_withdrawal: null,
                          items: [],
                        }),
                        ...(value === SOURCE_SUPPLIER_WITHDRAWALS && {
                          tanker_withdrawal: null,
                          items: [],
                        }),
                      };
                    });
                  }}
                  error={errors?.source}
                  formItemLayout={smallFormItemLayout}
                  options={source_return_options}
                />
              </Col>
            </Row>

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

            <Row>
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

            {state.source === SOURCE_SUPPLIER_WITHDRAWALS && (
              <div>
                <Divider orientation="left">Search Withdrawals</Divider>
                <Row>
                  <Col span={24}>
                    <SelectFieldGroup
                      disabled={state.items?.length > 0}
                      label="Supplier W/D"
                      value={null}
                      onSearch={(value) =>
                        onSupplierWithdrawalSearch({
                          value,
                          tanker: state.tanker,
                          setOptions,
                          filters: {
                            department: auth.user?.department,
                          },
                        })
                      }
                      onChange={(index) => {
                        const record = options.supplier_withdrawals?.[index];

                        if (record) {
                          const items = record.items.map((o) => {
                            return {
                              supplier_withdrawal_id: record._id,
                              supplier_withdrawal_item_id: o._id,
                              ww_no: record.ww_no,
                              tanker: record.tanker,
                              supplier: record.supplier,
                              stock: o.stock,
                              unit_of_measure: o.unit_of_measure,
                              quantity: "",
                            };
                          });

                          setState((prevState) => {
                            return {
                              ...prevState,
                              items: [...(prevState.items || []), ...items],
                              supplier_withdrawal: record,
                            };
                          });
                        }
                      }}
                      help="Enter Supplier name or WW#"
                      formItemLayout={formItemLayout}
                      data={options.supplier_withdrawals}
                      column="display_name"
                    />
                  </Col>
                </Row>
              </div>
            )}

            {state.source === SOURCE_TANKER_SCHEDULING && (
              <div>
                <Divider orientation="left">Search Tanker Scheduling</Divider>
                <Row>
                  <Col span={24}>
                    <SelectFieldGroup
                      disabled={state.items?.length > 0}
                      label="TS#"
                      value={null}
                      onSearch={(value) =>
                        onTankerWithdrawalSearch({
                          value,
                          tanker: state.tanker,
                          setOptions,
                          filters: {
                            department: auth.user?.department,
                          },
                        })
                      }
                      onChange={(index) => {
                        const record = options.tanker_withdrawals?.[index];

                        if (record) {
                          const items = (record.source_depot_items || []).map(
                            (o) => {
                              return {
                                tanker_withdrawal_id: record._id,
                                tw_no: record.tw_no,
                                supplier_withdrawal_id:
                                  o.supplier_withdrawal_id,
                                supplier_withdrawal_item_id:
                                  o.supplier_withdrawal_item_id,
                                ww_no: o.ww_no,
                                tanker: o.tanker,
                                supplier: o.supplier,
                                stock: o.stock,
                                unit_of_measure: o.unit_of_measure,
                                quantity: "",
                              };
                            }
                          );

                          const source_tanker_items = (
                            record.source_tankers || []
                          ).map((o) => {
                            return {
                              tanker_withdrawal_id: record._id,
                              tw_no: record.tw_no,
                              // supplier_withdrawal_id: o.supplier_withdrawal_id,
                              // supplier_withdrawal_item_id:
                              //   o.supplier_withdrawal_item_id,
                              // ww_no: o.ww_no,
                              tanker: o.tanker,
                              supplier: o.supplier,
                              stock: o.stock,
                              unit_of_measure: o.unit_of_measure,
                              quantity: "",
                            };
                          });

                          setState((prevState) => {
                            return {
                              ...prevState,
                              items: [
                                ...(prevState.items || []),
                                ...items,
                                ...source_tanker_items,
                              ],
                              tanker_withdrawal: record,
                            };
                          });
                        }
                      }}
                      help="Enter TS#"
                      formItemLayout={formItemLayout}
                      data={options.tanker_withdrawals}
                      column="display_name"
                    />
                  </Col>
                </Row>
              </div>
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

            <Table
              dataSource={addKeysToArray([
                ...(state.items || []),
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
              additional_buttons={[
                state.status?.approval_status === STATUS_CLOSED && (
                  <div className="control">
                    <button
                      className="button is-info"
                      onClick={(e) => {
                        e.preventDefault();
                        confirm({
                          title: "Open Transaction",
                          content: "Would you like to confirm?",
                          okText: "Open",
                          cancelText: "No",
                          onOk: () => {
                            onUpdateStatus({
                              url,
                              state,
                              approval_status: OPEN,
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
                          },
                          onCancel: () => {},
                        });
                      }}
                    >
                      <i className="fas fa-unlock pad-right-8" />
                      Open
                    </button>
                  </div>
                ),
              ]}
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
                window.open(`/print/tanker-withdrawals/${state._id}`, "_tab");
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
                  didMount.current = false;
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
