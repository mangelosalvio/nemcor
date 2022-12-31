import React, { useState, useRef, useEffect, useCallback } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  Button,
  PageHeader,
  Collapse,
  Row,
  Col,
  message,
  Input,
  Checkbox,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
  threeColumnFormItemLayout,
} from "./../../utils/Layouts";

import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onChange,
  onDeleteItem,
} from "../../utils/form_utilities";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import {
  addKeysToArray,
  onCategorySearch,
  onStationSearch,
  onStockInventorySearch,
  onStockSearch,
  onSupplierSearch,
  onUnitOfMeasureSearch,
} from "../../utils/utilities";
import CategoryFormModal from "../modals/CategoryFormModal";

import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import {
  item_type_options,
  senior_discount_options,
} from "../../utils/Options";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
import { authenticateAdmin } from "../../utils/authentications";
import RadioGroupFieldGroup from "../../commons/RadioGroupFieldGroup";
import { SENIOR_DISC_RATIO } from "./../../utils/constants";
import axios from "axios";

import numberFormat from "../../utils/numberFormat";
import CheckboxGroupFieldGroup from "../../commons/CheckboxGroupFieldGroup";
import { useNavigate } from "react-router-dom";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/products/";
const title = "Stock Form";

const initialValues = {
  _id: null,
  name: "",
  sku: "",
  category: null,
  meat_type: null,
  price: "",
  price: "",
  uom: "",
  description: "",
  taxable: true,
  type_of_senior_discount: SENIOR_DISC_RATIO,
  reorder_level: "",
  pieces_in_case: "",
  disabled: false,
  raw_materials: [],
  specific_category: "",
  cost: "",
  is_open_item: false,
  track_inventory: false,
};

const date_fields = [];

export default function StockForm({ stock_type }) {
  const history = useNavigate();
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [raw_material, setRawMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page_size, setPageSize] = useState(10);
  const [options, setOptions] = useState({
    categories: [],
    subcategories: [],
    stocks: [],
    suppliers: [],
    brands: [],
  });

  const [search_state, setSearchState] = useState({
    category: null,
    stock_type,
  });

  const [state, setState] = useState(initialValues);

  const categoryFormModal = useRef(null);

  const unit_of_measures_column = [
    {
      title: "Is Default",
      dataIndex: "is_default",
      width: 100,
      align: "center",
      render: (value, record, index) => {
        return (
          <Checkbox
            checked={value}
            onChange={(e) => {
              let unit_of_measures = [...state.unit_of_measures];
              unit_of_measures = unit_of_measures.map((o) => ({
                ...o,
                is_default: false,
              }));

              unit_of_measures[index] = {
                ...unit_of_measures[index],
                is_default: e.target.checked,
              };

              setState((prevState) => ({
                ...prevState,
                unit_of_measures,
              }));
            }}
          />
        );
      },
    },
    {
      title: "Description",
      dataIndex: "name",
    },
    {
      title: "Packaging",
      dataIndex: "packaging",
    },
    {
      title: "Unit",
      dataIndex: "unit",
    },

    {
      title: "",
      key: "action",
      width: 100,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.status) && isEmpty(state.deleted) && (
            <i
              className="fas fa-trash-alt"
              onClick={() =>
                onDeleteItem({
                  field: "unit_of_measures",
                  index,
                  setState,
                })
              }
            ></i>
          )}
        </span>
      ),
    },
  ];

  const tieup_column = [
    {
      title: "Tieup",
      dataIndex: ["tieup", "name"],
    },

    {
      title: "Price",
      dataIndex: "price",
      width: 200,
      render: (price, record, index) => {
        return (
          <Input
            value={price}
            onChange={(e) => {
              let tieup_prices = [...state.tieup_prices];
              tieup_prices[index] = {
                ...tieup_prices[index],
                price: e.target.value,
              };

              setState((prevState) => ({ ...prevState, tieup_prices }));
            }}
            className="has-text-right"
          />
        );
      },
    },
  ];

  const records_column = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
    },
    {
      title: "UOM",
      dataIndex: ["unit_of_measures"],
      render: (unit_of_measures) =>
        unit_of_measures?.filter((o) => o.is_default)?.[0]?.unit,
    },
    {
      title: "Price",
      dataIndex: "price",
      align: "right",
      width: 100,
      render: (value, record) => (
        <Input
          className="input-price"
          defaultValue={value}
          name="price"
          onBlur={(e) => {
            const target = e.target;
            onUpdatePrice({
              _id: record._id,
              price: target.value,
              price_key: target.name,
            });
          }}
        />
      ),
      width: 120,
    },

    {
      title: "",
      key: "action",
      align: "center",
      width: 50,
      render: (text, record) => (
        <i
          className="fa-solid fa-pen-to-square"
          onClick={() =>
            edit({
              record,
              setErrors,
              setRecords,
              url,
              setState,
            })
          }
        ></i>
      ),
    },
  ];

  const onUpdatePrice = useCallback(({ _id, price, price_key = "price" }) => {
    axios
      .post(`/api/products/${_id}/price`, {
        price,
        price_key,
      })
      .then(() => {
        message.success("Price Updated");
      })
      .catch((err) =>
        message.error("There was an error processing your requrest")
      );
  }, []);

  useEffect(() => {
    onCategorySearch({ value: "", options, setOptions, stock_type });
    onSearch({
      page: 1,
      page_size,
      search_keyword,
      url,
      setRecords,
      setTotalRecords,
      setCurrentPage,
      setErrors,
      advance_search: search_state,
    });
    if (!isEmpty(search_state.category)) {
      onSearch({
        page: 1,
        page_size,
        search_keyword,
        url,
        setRecords,
        setTotalRecords,
        setCurrentPage,
        setErrors,
        advance_search: search_state,
      });
    }

    return () => {};
  }, [search_state.category]);

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });
    return () => {};
  }, []);

  return (
    <Content className="content-padding">
      <CategoryFormModal
        setField={(category) => {
          setState((prevState) => ({
            ...prevState,
            category,
          }));
        }}
        ref={categoryFormModal}
      />
      <Row>
        <Col span={8}>
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Col span={16}>
          <div className="is-flex flex-direction-row stock-category-search">
            <div style={{ width: "200px" }}>
              <SelectFieldGroup
                value={search_state.supplier?.name}
                onSearch={(value) => onSupplierSearch({ value, setOptions })}
                onChange={(index) => {
                  const supplier = options.suppliers?.[index] || null;
                  setSearchState((prevState) => ({
                    ...prevState,
                    supplier,
                  }));
                }}
                formItemLayout={null}
                data={options.suppliers}
                column="name"
              />
            </div>

            <Searchbar
              name="search_keyword"
              onSearch={(value, e) => {
                e.preventDefault();
                onSearch({
                  page: 1,
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
              onChange={(e) => setSearchKeyword(e.target.value)}
              value={search_keyword}
              onNew={() => {
                setState({
                  ...initialValues,
                  category: { ...search_state.category },
                });
                setRecords([]);
              }}
            />
          </div>
        </Col>
      </Row>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
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
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={() =>
              onSubmit({
                values: {
                  ...state,
                },
                auth,
                url,
                setErrors,
                setState,
                date_fields,
                setLoading,
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
                    advance_search: search_state,
                  });
                },
              })
            }
            initialValues={initialValues}
          >
            <TextFieldGroup
              label="Name"
              name="name"
              error={errors.name}
              formItemLayout={formItemLayout}
              value={state.name}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value?.toUpperCase(),
                  setState,
                });
              }}
              autoComplete="off"
            />

            <SelectFieldGroup
              label="Category"
              value={state.category?.name}
              onSearch={(value) =>
                onCategorySearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const category = options.categories[index];
                setState((prevState) => ({
                  ...prevState,
                  category,
                }));
              }}
              formItemLayout={formItemLayout}
              data={options.categories}
              column="name"
            />
            <Row key="form" gutter={4}>
              <Col span={24}>
                <SelectFieldGroup
                  label="Unit of Measures"
                  value={null}
                  onSearch={(value) =>
                    onUnitOfMeasureSearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    if (index >= 0) {
                      setState((prevState) => {
                        return {
                          ...prevState,
                          unit_of_measures: [
                            ...(prevState?.unit_of_measures || []),
                            options.unit_of_measures?.[index] || null,
                          ],
                        };
                      });
                    }
                  }}
                  error={errors.unit_of_measure}
                  formItemLayout={formItemLayout}
                  data={options.unit_of_measures}
                  column="unit"
                  onAddItem={() => {
                    unitOfMeasureFormModal.current.open();
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col offset={4} span={20}>
                <Table
                  dataSource={addKeysToArray(state.unit_of_measures || [])}
                  columns={unit_of_measures_column}
                  pagination={false}
                />
              </Col>
            </Row>

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Price"
                  name="price"
                  error={errors.price}
                  formItemLayout={smallFormItemLayout}
                  value={state.price}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
            </Row>

            <CheckboxFieldGroup
              label="Disabled"
              name="disabled"
              error={errors.disabled}
              formItemLayout={formItemLayout}
              checked={state.disabled}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.checked,
                  setState,
                });
              }}
            />

            <Form.Item className="m-t-1" {...tailFormItemLayout}>
              <div className="field is-grouped">
                <div className="control">
                  <button
                    className="button is-small"
                    onClick={(e) => {
                      e.preventDefault();
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
                  >
                    Back
                  </button>
                </div>
                <div className="control">
                  <button className="button is-small is-primary">Save</button>
                </div>
                {!isEmpty(state._id) ? (
                  <span
                    className="button is-danger is-outlined is-small"
                    onClick={() => {
                      onDelete({
                        id: state._id,
                        url,
                      });
                      setState({ ...initialValues });
                    }}
                  >
                    <span>Delete</span>
                    <i className="fa-solid fa-xmark"></i>
                  </span>
                ) : null}
              </div>
            </Form.Item>
          </Form>
        ) : (
          <Table
            dataSource={records}
            columns={records_column}
            rowKey={(record) => record._id}
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
                  advance_search: search_state,
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
