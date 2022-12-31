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
  onUnitSearch,
  onEmployeeSearch,
} from "../../utils/utilities";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";
import numberFormat from "../../utils/numberFormat";
import round from "../../utils/round";
import axios from "axios";
import { debounce, sumBy, uniq, uniqBy } from "lodash";
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
  SOURCE_SUPPLIER_DEPOT,
  STATUS_CLOSED,
} from "../../utils/constants";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { onCustomerSearch } from "../utils/utilities";
import {
  delivery_type_options,
  source_withdrawal_options,
} from "../../utils/Options";
import { computeTotalAmount } from "../../utils/computations";
import UnitFormModal from "../modals/UnitFormModal";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
const { Content } = Layout;
const { Panel } = Collapse;
const url = "/api/tanker-withdrawals/";
const title = "Tanker Scheduling Form";

const initialItemValues = {
  stock: null,
  quantity: "",
  unit_of_measure: null,
};

const transaction_counter = {
  label: "TS #",
  key: "tw_no",
};

const date_fields = ["date", "date_needed"];

export default function TankerWithdrawalForm({ navigate }) {
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
  const warehouseField = useRef(null);
  const unitOfMeasureRef = useRef(null);

  const [search_state, setSearchState] = useState({});
  const didMount = useRef(false);
  const unitFormModal = useRef(null);

  const initialValues = {
    _id: null,
    tw_no: "",
    tanker: null,
    date: moment(),
    sales_orders: [],
    remarks: "",
    items: [],
    source_tankers: [],
    source_depot_items: [],

    total_amount: 0,
  };
  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "TS #",
      dataIndex: "tw_no",
    },

    {
      title: "Date",
      dataIndex: "date",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Source",
      dataIndex: ["source_withdrawal"],
    },
    // {
    //   title: "Tank Farm",
    //   dataIndex: ["warehouse", "name"],
    // },
    {
      title: "Tanker",
      dataIndex: ["tanker", "plate_no"],
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
      title: "Customers",
      dataIndex: "items",
      width: 350,
      render: (items) =>
        uniqBy((items || []).map((o) => o?.customer?.name)).join("/ "),
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
      title: "SO#",
      dataIndex: ["so_no"],
      align: "center",
      width: 50,
    },
    {
      title: "Ext DR#",
      dataIndex: ["external_dr_ref"],
      align: "center",
      width: 80,
      render: (value, record, index) =>
        record.footer !== 1 &&
        (isEmpty(state.status?.approval_status) ||
          [state.status?.approval_status].includes(OPEN)) ? (
          <Input
            value={value}
            onChange={(e) => {
              const target = e.target;
              const items = [...state.items];
              items[index] = {
                ...items[index],
                external_dr_ref: target.value,
              };
              didMount.current = false;
              setState((prevState) => ({
                ...prevState,
                items,
              }));
            }}
          />
        ) : (
          value
        ),
    },
    {
      title: "Company",
      dataIndex: ["company", "name"],
    },
    {
      title: "Customer",
      dataIndex: ["customer", "name"],
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
      render: (value, record, index) =>
        record.footer !== 1 &&
        (isEmpty(state.status?.approval_status) ||
          [state.status?.approval_status].includes(OPEN)) ? (
          <Input
            value={value}
            className="has-text-right"
            onChange={(e) => {
              const quantity = e.target.value;
              const price = record.price;
              const amount = computeTotalAmount({
                quantity,
                price,
              });

              const items = [...state.items];
              items[index] = {
                ...items[index],
                quantity,
                amount,
              };
              didMount.current = false;
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
      title: "UOM",
      width: 100,
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
              didMount.current = false;
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
      title: "Unit",
      dataIndex: ["unit"],
      align: "right",
      width: 150,
      render: (unit, record, item_index) =>
        record.footer !== 1 && (
          <SelectFieldGroup
            value={unit?.name}
            onSearch={(value) => {
              onUnitSearch({
                value,
                customer: record.customer,
                options,
                setOptions,
              });
            }}
            onChange={(index) => {
              const unit = options.units?.[index] || null;

              const _items = [...state.items];

              _items[item_index] = {
                ..._items[item_index],
                unit,
              };

              didMount.current = false;
              setState((prevState) => {
                return {
                  ...prevState,
                  items: _items,
                };
              });
            }}
            error={errors.unit}
            formItemLayout={null}
            data={options.units}
            column="name"
            onAddItem={() =>
              unitFormModal.current.open({
                customer: record.customer,
                item_index,
              })
            }
          />
        ),
    },

    {
      title: "",
      key: "action",
      width: 100,
      align: "center",
      render: (text, record, index) => (
        <span>
          {record.footer !== 1 &&
            (isEmpty(state.status) ||
              state.status?.approval_status === OPEN) && (
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

  const onSearchSalesOrders = useCallback(
    ({ period_covered, setErrors }) => {
      axios
        .post("/api/sales-orders/for-bundling", {
          period_covered,
          department: auth.user?.department,
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
    },
    [auth.user?.department]
  );

  const saveSource = useCallback(
    debounce(
      ({
        source_withdrawal,
        source_depot_items,
        source_tankers,
        warehouse,
        _id,
        user,
      }) => {
        axios
          .post(`/api/tanker-withdrawals/${_id}/update-source`, {
            source_withdrawal,
            source_depot_items,
            source_tankers,
            warehouse,
            user,
          })
          .then(() => {
            message.success("Tanker Scheduling Updated", 1);
          })
          .catch((err) => {
            message.error("There was an error processing your request");
          });
      },
      1000
    ),
    []
  );

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
    if (state.status?.approval_status === STATUS_CLOSED) {
      if (!didMount.current) {
        return;
      }

      saveSource({
        source_withdrawal: state.source_withdrawal,
        source_depot_items: state.source_depot_items,
        source_tankers: state.source_tankers,
        warehouse: state.warehouse,
        _id: state._id,
        user: auth.user,
      });
    }

    return () => {};
  }, [
    state.source_withdrawal,
    state.source_depot_items,
    state.source_tankers,
    state.warehouse,
    state._id,
    state.status,
    auth.user,
  ]);

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
    onSubmit({
      values: state,
      auth,
      url,
      setErrors,
      setState,
      date_fields,
      set_state_on_save: false,
    });
    return () => {};
  }, [state.items]);

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
      <UnitFormModal
        setField={({ unit, index, customer }) => {
          const _items = [...state.items];

          _items[index] = {
            ..._items[index],
            unit,
          };

          didMount.current = false;
          setState((prevState) => {
            return {
              ...prevState,
              items: _items,
            };
          });
          onUnitSearch({
            value: "",
            customer,
            options,
            setOptions,
          });
        }}
        ref={unitFormModal}
      />
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
              setOptions((prevState) => {
                return {
                  ...prevState,
                  units: [],
                };
              });
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
                        label="TS #"
                        name="tw_no"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.tw_no}
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
                  name="source_withdrawal"
                  value={state.source_withdrawal}
                  onChange={(value) => {
                    setState((prevState) => {
                      return {
                        ...prevState,
                        source_withdrawal: value,
                        ...(value === SOURCE_SUPPLIER && {
                          warehouse: null,
                          source_depot_items: [],
                        }),
                        ...(value === SOURCE_DEPOT && {
                          po_no: "",
                          purchase_order: null,
                          source_tankers: [],
                        }),
                        ...(value === SOURCE_SUPPLIER_DEPOT && {
                          warehouse: null,
                          source_depot_items: [],
                          po_no: "",
                          purchase_order: null,
                          source_tankers: [],
                        }),
                      };
                    });
                  }}
                  error={errors?.source_withdrawal}
                  formItemLayout={smallFormItemLayout}
                  options={source_withdrawal_options}
                />
              </Col>
            </Row>

            {[SOURCE_SUPPLIER, SOURCE_SUPPLIER_DEPOT].includes(
              state.source_withdrawal
            ) && (
              <div>
                <Divider orientation="left">Search Withdrawals</Divider>
                <Row>
                  <Col span={24}>
                    <SelectFieldGroup
                      label="Supplier W/D"
                      value={null}
                      onSearch={(value) =>
                        onSupplierWithdrawalSearch({
                          value,
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
                              quantity: o.quantity,
                            };
                          });

                          setState((prevState) => {
                            return {
                              ...prevState,
                              source_tankers: [
                                ...(prevState.source_tankers || []),
                                ...items,
                              ],
                            };
                          });
                        }
                      }}
                      error={errors.source_tankers}
                      help="Enter Supplier name or WW#"
                      formItemLayout={formItemLayout}
                      data={options.supplier_withdrawals}
                      column="display_name"
                    />
                  </Col>
                </Row>
                <Row>
                  <Col offset={4} span={20}>
                    <Table
                      dataSource={addKeysToArray([
                        ...(state.source_tankers || []),
                        {
                          footer: 1,
                          quantity: sumBy(state.source_tankers || [], (o) =>
                            round(o.quantity)
                          ),
                        },
                      ])}
                      columns={[
                        {
                          title: "WW #",
                          dataIndex: ["ww_no"],
                          width: 80,
                        },
                        {
                          title: "Tanker",
                          dataIndex: ["tanker", "plate_no"],
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
                              [OPEN, STATUS_CLOSED].includes(
                                state.status?.approval_status
                              )) ? (
                              <Input
                                value={value}
                                className="has-text-right"
                                onChange={(e) => {
                                  const quantity = e.target.value;

                                  const source_tankers = [
                                    ...state.source_tankers,
                                  ];
                                  source_tankers[index] = {
                                    ...source_tankers[index],
                                    quantity,
                                  };
                                  setState((prevState) => ({
                                    ...prevState,
                                    source_tankers,
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
                                  [OPEN, STATUS_CLOSED].includes(
                                    state?.status?.approval_status
                                  )) &&
                                isEmpty(state.deleted) && (
                                  <span
                                    onClick={() =>
                                      onDeleteItem({
                                        field: "source_tankers",
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
                      ]}
                      pagination={false}
                      rowClassName={(record, index) => {
                        if (record.footer === 1) {
                          return "footer-summary has-text-weight-bold";
                        }
                      }}
                    />
                  </Col>
                </Row>
              </div>
            )}

            {/* {state.source_withdrawal === SOURCE_SUPPLIER && (
              <SelectFieldGroup
                label="W/D from Tanker"
                value={state.from_tanker?.plate_no}
                onSearch={(value) => onTankerSearch({ value, setOptions })}
                onChange={(index) => {
                  const from_tanker = options.tankers?.[index] || null;
                  setState((prevState) => ({
                    ...prevState,
                    from_tanker,
                  }));
                }}
                help="Tanker where the supplies are withdrawn"
                error={errors.from_tanker}
                formItemLayout={formItemLayout}
                data={options.tankers}
                column="display_name"
              />
            )} */}

            {/*   {[SOURCE_DEPOT, SOURCE_SUPPLIER_DEPOT].includes(
              state.source_withdrawal
            ) && (
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
            )} */}

            {[SOURCE_DEPOT, SOURCE_SUPPLIER_DEPOT].includes(
              state.source_withdrawal
            ) && (
              <div>
                <Divider orientation="left">
                  Withdrawal Items from Tank Farm/Depot
                </Divider>
                {(isEmpty(state.status?.approval_status) ||
                  [OPEN, STATUS_CLOSED].includes(
                    state.status?.approval_status
                  )) && (
                  <Row key="form" className="ant-form-vertical" gutter="4">
                    <Col offset={4} span={4}>
                      <SelectFieldGroup
                        key="1"
                        inputRef={warehouseField}
                        label="Tank Farm"
                        value={item.warehouse?.name}
                        onSearch={(value) =>
                          onWarehouseSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const warehouse = options.warehouses?.[index] || null;

                          setItem({
                            ...item,
                            warehouse,
                          });
                          stockField.current.focus();
                        }}
                        error={errors.warehouse_item}
                        formItemLayout={null}
                        data={options.warehouses}
                        column="name"
                        // onAddItem={() => stockFormModal.current.open()}
                      />
                    </Col>

                    <Col span={5}>
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
                          let unit_of_measure = null;
                          if (stock) {
                            unit_of_measure =
                              stock.unit_of_measures.filter(
                                (o) => o.is_default
                              )?.[0] || null;
                          }

                          setItem({
                            ...item,
                            stock: options.stocks[index],
                            unit_of_measure,
                            discount_rate: state?.supplier?.discount_rate || 0,
                          });
                          quanttiyField.current.focus();
                        }}
                        error={errors.source_depot_item}
                        formItemLayout={null}
                        data={options.stocks}
                        column="display_name"
                        // onAddItem={() => stockFormModal.current.open()}
                      />
                    </Col>

                    <Col span={4}>
                      <TextFieldGroup
                        label="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          setItem({
                            ...item,
                            quantity: e.target.value,
                            old_quantity: e.target.value,
                          });
                        }}
                        error={errors.item && errors.item.quantity}
                        formItemLayout={null}
                        inputRef={quanttiyField}
                        onPressEnter={(e) => {
                          e.preventDefault();
                          unitOfMeasureRef.current.focus();
                          //addItemButton.current.click();
                        }}
                      />
                    </Col>
                    <Col span={3}>
                      <SelectFieldGroup
                        label="UOM"
                        inputRef={unitOfMeasureRef}
                        value={item.unit_of_measure?.unit}
                        onChange={(index) => {
                          const unit_of_measure =
                            item.stock?.unit_of_measures?.[index];

                          setItem((prevState) => ({
                            ...prevState,
                            unit_of_measure,
                          }));
                        }}
                        error={errors.unit_of_measure}
                        formItemLayout={null}
                        data={item.stock?.unit_of_measures || []}
                        column="unit"
                      />
                    </Col>

                    <Col className="is-flex field-button-padding">
                      <input
                        type="button"
                        ref={addItemButton}
                        className="button is-primary is-small"
                        onClick={() => {
                          if (isEmpty(item.warehouse?._id)) {
                            return message.error("Tank Farm is required");
                          }

                          if (isEmpty(item.stock?._id)) {
                            return message.error("Stock is required");
                          }

                          if (isEmpty(item.quantity)) {
                            return message.error("Quanttiy is required");
                          }
                          if (isEmpty(item.unit_of_measure?._id)) {
                            return message.error("UOM is required");
                          }

                          setState((prevState) => ({
                            ...prevState,
                            source_depot_items: [
                              ...(prevState.source_depot_items || []),
                              {
                                ...item,
                                quantity:
                                  !isEmpty(item.quantity) &&
                                  validator.isNumeric(item.quantity.toString())
                                    ? parseFloat(item.quantity)
                                    : 0,
                              },
                            ],
                          }));
                          setItem(initialItemValues);
                          stockField.current.focus();
                        }}
                        value="Add Item"
                      />
                    </Col>
                  </Row>
                )}

                <Row>
                  <Col offset={4} span={20}>
                    <Table
                      dataSource={addKeysToArray([
                        ...(state.source_depot_items || []),
                        {
                          footer: 1,
                          quantity: sumBy(state.source_depot_items || [], (o) =>
                            round(o.quantity)
                          ),
                        },
                      ])}
                      columns={[
                        {
                          title: "Tank Farm",
                          dataIndex: ["warehouse", "name"],
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
                              [OPEN, STATUS_CLOSED].includes(
                                state.status?.approval_status
                              )) ? (
                              <Input
                                value={value}
                                className="has-text-right"
                                onChange={(e) => {
                                  const quantity = e.target.value;

                                  const source_depot_items = [
                                    ...state.source_depot_items,
                                  ];
                                  source_depot_items[index] = {
                                    ...source_depot_items[index],
                                    quantity,
                                  };
                                  setState((prevState) => ({
                                    ...prevState,
                                    source_depot_items,
                                  }));
                                }}
                              />
                            ) : (
                              value && numberFormat(value)
                            ),
                        },
                        {
                          title: "UOM",
                          dataIndex: ["unit_of_measure", "unit"],
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
                                  [OPEN, STATUS_CLOSED].includes(
                                    state?.status?.approval_status
                                  )) &&
                                isEmpty(state.deleted) && (
                                  <span
                                    onClick={() =>
                                      onDeleteItem({
                                        field: "source_depot_items",
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
                      ]}
                      pagination={false}
                      rowClassName={(record, index) => {
                        if (record.footer === 1) {
                          return "footer-summary has-text-weight-bold";
                        }
                      }}
                    />
                  </Col>
                </Row>
              </div>
            )}

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

            <SelectFieldGroup
              label="Driver"
              value={state.driver?.name}
              onSearch={(value) => onEmployeeSearch({ value, setOptions })}
              onChange={(index) => {
                const driver = options.employees?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  driver,
                }));
              }}
              error={errors.driver}
              formItemLayout={formItemLayout}
              data={options.employees}
              column="display_name"
            />

            {(isEmpty(state.status?.approval_status) ||
              [state.status?.approval_status].includes(OPEN)) && (
              <div>
                <Divider orientation="left">Search Sales Orders</Divider>
                <Row>
                  <Col span={24}>
                    <RangeDatePickerFieldGroup
                      label="Period"
                      name="period_covered"
                      value={state.period_covered}
                      onChange={(dates) =>
                        setState((prevState) => ({
                          ...prevState,
                          period_covered: dates,
                        }))
                      }
                      error={errors.period_covered}
                      formItemLayout={formItemLayout}
                    />
                  </Col>
                  <Col offset={4} span={20}>
                    <Button
                      onClick={() => {
                        onSearchSalesOrders({
                          period_covered: state.period_covered,
                          setErrors,
                        });
                      }}
                    >
                      Search
                    </Button>
                  </Col>
                </Row>

                <Row>
                  <Col span={24}>
                    <Table
                      dataSource={addKeysToArray([
                        ...(state.sales_orders || []),
                        {
                          footer: 1,
                          quantity: sumBy(state.sales_orders || [], (o) =>
                            round(o.quantity)
                          ),
                          balance: sumBy(state.sales_orders || [], (o) =>
                            round(o.balance)
                          ),
                          confirmed_quantity: sumBy(
                            state.sales_orders || [],
                            (o) => round(o.confirmed_quantity)
                          ),
                          amount: sumBy(state.sales_orders, (o) =>
                            round(o.amount)
                          ),
                        },
                      ])}
                      columns={[
                        {
                          title: "SO #",
                          dataIndex: ["so_no"],
                          width: 80,
                        },
                        {
                          title: "Company",
                          dataIndex: ["company", "name"],
                        },
                        {
                          title: "Customer",
                          dataIndex: ["customer", "name"],
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
                            `${numberFormat(record.quantity)}`,
                        },
                        {
                          title: "Balance",
                          dataIndex: ["balance"],
                          align: "right",
                          width: 200,
                          render: (value, record, index) =>
                            `${numberFormat(record.balance)}`,
                        },

                        {
                          title: "Bundle",
                          dataIndex: "confirmed_quantity",
                          align: "right",
                          width: 200,
                          render: (value, record, index) => (
                            <span>
                              {record.footer !== 1 && (
                                <Row gutter={8}>
                                  <Col span={24}>
                                    <Input
                                      type="number"
                                      step={0.01}
                                      className="has-text-right"
                                      value={record.confirmed_quantity}
                                      onChange={(e) => {
                                        const value = e.target.value;

                                        let items = [
                                          ...(state.sales_orders || []),
                                        ];
                                        let item = items[index];
                                        let confirmed_quantity = value;

                                        if (
                                          confirmed_quantity > item.balance &&
                                          !item.is_open_quantity
                                        ) {
                                          return message.error(
                                            "Unable to set quantity greater than balance"
                                          );
                                        }

                                        const amount = round(
                                          confirmed_quantity * item.price
                                        );

                                        items[index] = {
                                          ...items[index],
                                          confirmed_quantity,
                                          amount,
                                        };

                                        setState((prevState) => {
                                          return {
                                            ...prevState,
                                            sales_orders: items,
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
                          title: "UOM",
                          width: 150,
                          dataIndex: ["unit_of_measure", "unit"],
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
                          render: (value) => value && numberFormat(value),
                        },
                        {
                          title: "Open Qty",
                          dataIndex: ["is_open_quantity"],
                          align: "center",
                          width: 150,
                          render: (checked, record) =>
                            record.footer !== 1 &&
                            checked && <span>&#10004;</span>,
                        },
                        {
                          title: "Unit",
                          width: 150,
                          dataIndex: ["unit", "name"],
                        },
                        {
                          title: "",
                          key: "action",
                          width: 100,
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
                      ]}
                      pagination={false}
                      rowClassName={(record, index) => {
                        if (record.footer === 1) {
                          return "footer-summary has-text-weight-bold";
                        }
                      }}
                    />
                  </Col>
                </Row>

                <Row className="m-b-1 m-t-1">
                  <Col span={24}>
                    <Button
                      onClick={() => {
                        let sales_orders = [...(state.sales_orders || [])]
                          .filter((o) => {
                            return o.confirmed_quantity > 0;
                          })
                          .map((o) => {
                            const quantity = o.confirmed_quantity;
                            delete o.confirmed_quantity;

                            return {
                              ...o,
                              quantity,
                            };
                          });

                        let items = [...state.items, ...sales_orders];
                        setState((prevState) => ({
                          ...prevState,
                          sales_orders: [],
                          items,
                        }));
                      }}
                    >
                      Bundle
                    </Button>
                  </Col>
                </Row>
              </div>
            )}

            <CheckboxFieldGroup
              label="DR per Unit"
              name="is_per_unit_dr"
              error={errors.is_per_unit_dr}
              formItemLayout={formItemLayout}
              checked={state.is_per_unit_dr}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.checked,
                  setState,
                });
              }}
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
