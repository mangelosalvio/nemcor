import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Collapse,
  PageHeader,
  Button,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";
import {
  EditOutlined,
  CloseOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
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
  onFinalize,
} from "../../utils/form_utilities";
import moment from "moment";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
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
  APPROVED,
  DISCOUNT_PERCENT,
  DISCOUNT_VALUE,
  PENDING,
  USER_ADMINISTRATOR,
  UNITS_CATEGORY,
} from "../../utils/constants";
import { debounce, sumBy } from "lodash";
import { Link } from "react-router-dom";
import validator from "validator";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
import RadioGroupFieldGroup from "../../commons/RadioGroupFieldGroup";
import {
  jo_status_options,
  received_with_options,
} from "./../../utils/Options";
import CheckboxGroupFieldGroup from "../../commons/CheckboxGroupFieldGroup";
import ItemsNoCostField from "../../commons/ItemsNoCostField";
import FormButtons from "../../commons/FormButtons";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/physical-counts/";
const title = "Actual Count Form";

const date_fields = ["date"];

const transaction_counter = {
  label: "PC #",
  key: "pc_no",
};

const initialValues = {
  _id: null,
  [transaction_counter.key]: null,
  branch_reference: "",
  date: moment(),

  warehouse: null,
  remarks: "",
  is_merchandise: true,

  items: [],
};

const initialItemValues = {
  stock: null,
  quantity: null,
  price: null,
  amount: null,
  discount_type: "",
  discount: "",
  phone_details: [],
  status: null,
};

const getMainWarehouse = ({ setState, setItem, setRecords }) => {
  axios
    .get("/api/account-settings/main_warehouse")
    .then((response) => {
      setState({ ...initialValues, warehouse: response.data.value });
      setItem(initialItemValues);
      setRecords([]);
    })
    .catch((err) => console.log(err));
};

export default function PhysicalCountForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [item, setItem] = useState(initialItemValues);
  const [options, setOptions] = useState({
    suppliers: [],
    stocks: [],
  });
  const [search_state, setSearchState] = useState({
    period_covered: [null, null],
    warehouse: null,
    branch_reference: "",
  });

  const [state, setState] = useState(initialValues);

  const phoneDetailsField = useRef([]);

  const records_column = [
    {
      title: "PC #",
      dataIndex: "pc_no",
    },
    {
      title: "From",
      dataIndex: ["warehouse", "name"],
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
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
      title: "Qty",
      dataIndex: "quantity",
      align: "center",
      width: 80,
      render: (value, record, index) => (
        <span>
          {record.footer !== 1 &&
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

                      items[index] = {
                        ...items[index],
                        quantity,
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
      title: "Inventory Count",
      dataIndex: ["inventory_quantity"],
      align: "center",
      width: 80,
    },
    {
      title: "Adjustment",
      dataIndex: ["adjustment_quantity"],
      align: "center",
      width: 80,
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) && isEmpty(state.deleted) && (
            <DeleteOutlined
              onClick={() =>
                onDeleteItem({
                  field: "items",
                  index,
                  setState,
                })
              }
            />
          )}
        </span>
      ),
    },
  ];

  useEffect(() => {
    onSearch({
      page: 1,
      search_keyword,
      url,
      setRecords,
      setTotalRecords,
      setCurrentPage,
      setErrors,
    });
    return () => {};
  }, []);

  /*   const saveTransaction = useCallback(
    debounce((form_data) => {
      onSubmit(form_data);
    }, 500),
    []
  ); */

  /* useEffect(() => {
    if (state.items.length > 0) {
      const form_data = {
        values: state,
        auth,
        url,
        setErrors,
        setState,
        date_fields,
        setLoading,
        set_state_on_save: false,
      };

      if (!isEmpty(state._id)) {
        saveTransaction(form_data);
      }
    }

    return () => {};
  }, [state.items]) */ return (
    <Content className="content-padding">
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
              setItem(initialItemValues);
              setRecords([]);
              setState({
                ...initialValues,
                date: moment(),
              });
              // axios
              //   .get("/api/stocks/all-inventory-items")
              //   .then((response) => {
              //     if (response.data) {
              //       let items = response.data.map((o) => {
              //         return {
              //           stock: { ...o },
              //           quantity: "",
              //         };
              //       });

              //       setState((prevState) => ({
              //         ...initialValues,
              //         date: moment(),
              //         items,
              //       }));
              //     }
              //   })
              //   .catch((err) =>
              //     message.error("There was an error getting inventory items")
              //   );
            }}
          />
        </div>
      </div>

      {/* Start of Advance Search */}
      <Row>
        <Col span={24} className="m-b-1">
          <Collapse>
            <Panel header="Advance Search">
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
                        label="Warehouse"
                        value={search_state.warehouse?.name}
                        onSearch={(value) =>
                          onWarehouseSearch({ value, options, setOptions })
                        }
                        onChange={(index) => {
                          const warehouse = options.warehouses[index];
                          setSearchState((prevState) => ({
                            ...prevState,
                            warehouse,
                          }));
                        }}
                        formItemLayout={smallFormItemLayout}
                        data={options.warehouses}
                        column="name"
                      />
                    </Col>
                    <Col span={8}>
                      <TextFieldGroup
                        label="Reference"
                        name="branch_reference"
                        formItemLayout={smallFormItemLayout}
                        value={search_state.branch_reference}
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
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={() => {
                              onSearch({
                                page: 1,
                                search_keyword,
                                url,
                                setRecords,
                                setTotalRecords,
                                setCurrentPage,
                                setErrors,
                                advance_search: search_state,
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
      {/* End of Advanced Search */}

      <div style={{ background: "#fff", padding: 24 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={(values) => {
              if (!loading) {
                onSubmit({
                  values: {
                    ...state,
                    items: state.items.filter((o) => !isEmpty(o.quantity)),
                  },
                  auth,
                  url,
                  setErrors,
                  setState,
                  date_fields,
                  setLoading,
                });
              }
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

            {!isEmpty(state._id) && (
              <TextFieldGroup
                label="Ref"
                value={state.branch_reference}
                error={errors.branch_reference}
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

            {isEmpty(state.status) && isEmpty(state.deleted) && (
              <ItemsNoCostField
                item={item}
                setItem={setItem}
                setState={setState}
                items_key="items"
                options={options}
                setOptions={setOptions}
                errors={errors}
                initialItemValues={initialItemValues}
              />
            )}

            <Table
              dataSource={addKeysToArray(state.items)}
              columns={items_column}
              pagination={false}
            />

            {isEmpty(state.deleted) && (
              <FormButtons
                state={state}
                auth={auth}
                loading={loading}
                url={url}
                transaction="physical-counts"
                onDelete={onDelete}
                initialValues={initialValues}
                initialItemValues={initialItemValues}
                setState={setState}
                setItem={setItem}
                onFinalize={() => {
                  console.log("here");
                  onFinalize({
                    id: state._id,
                    url,
                    user: auth.user,
                    edit,
                    setState,
                    setErrors,
                    setRecords,
                    date_fields,
                  });
                }}
                has_print={false}
                onSearch={() => {
                  onSearch({
                    page: current_page,
                    search_keyword,
                    url,
                    setRecords,
                    setTotalRecords,
                    setCurrentPage,
                    setErrors,
                    advance_search: search_state,
                  });
                }}
                finalize_label="Count"
              />
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
                  advance_search: search_state,
                }),
              total: total_records,
              pageSize: 60,
            }}
          />
        )}
      </div>
    </Content>
  );
}
