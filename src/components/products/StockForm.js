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
} from "../../utils/Layouts";

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
  product_type_options,
  senior_discount_options,
} from "../../utils/Options";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
import { authenticateAdmin } from "../../utils/authentications";
import RadioGroupFieldGroup from "../../commons/RadioGroupFieldGroup";
import { SENIOR_DISC_RATIO } from "../../utils/constants";
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
  const [branches, setBranches] = useState([]);
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
      dataIndex: ["unit_of_measure"],
    },
  ];

  //setup branch pricing
  useEffect(() => {
    setState((prevState) => {
      //check branch pricing and add branches that are not found
      let branch_pricing = [...(prevState.branch_pricing || [])];
      const branches_not_found = branches.filter((o) => {
        return !branch_pricing.map((_o) => _o.branch?._id).includes(o._id);
      });

      branch_pricing = [
        ...branch_pricing,
        ...branches_not_found.map((o) => {
          return {
            branch: o,
            price: "",
            wholesale_price: "",
          };
        }),
      ];

      return {
        ...prevState,
        branch_pricing,
      };
    });

    return () => {};
  }, [state._id, branches]);

  useEffect(() => {
    onCategorySearch({ value: "", options, setOptions, stock_type });

    //get branches
    axios.get("/api/branches/listings").then((response) => {
      setBranches([...response.data]);
    });

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

    return () => {};
  }, [search_state.category]);

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
                value={search_state.category?.name}
                onSearch={(value) => onCategorySearch({ value, setOptions })}
                onChange={(index) => {
                  const category = options.categories?.[index] || null;
                  setSearchState((prevState) => ({
                    ...prevState,
                    category,
                  }));
                }}
                formItemLayout={null}
                data={options.categories}
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
                  branch_pricing: [
                    ...branches.map((o) => {
                      return {
                        branch: o,
                        price: "",
                        wholesale_price: "",
                      };
                    }),
                  ],
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
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Name"
                  name="name"
                  error={errors.name}
                  formItemLayout={smallFormItemLayout}
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
              </Col>
              <Col span={12}>
                <SelectFieldGroup
                  label="Category"
                  value={state.category?.name}
                  onSearch={(value) =>
                    onCategorySearch({ value, options, setOptions })
                  }
                  onChange={(index) => {
                    const category = options.categories?.[index] || null;
                    setState((prevState) => ({
                      ...prevState,
                      category,
                    }));
                  }}
                  formItemLayout={smallFormItemLayout}
                  data={options.categories}
                  column="name"
                />
              </Col>
            </Row>

            <Row>
              <Col offset={4} span={20}>
                <Table
                  dataSource={addKeysToArray([...(state.branch_pricing || [])])}
                  columns={[
                    {
                      title: "Company",
                      dataIndex: ["branch", "company", "name"],
                    },
                    {
                      title: "Branch",
                      dataIndex: ["branch", "name"],
                    },
                    {
                      title: "Retail",
                      dataIndex: "price",
                      render: (price, record, index) => {
                        return (
                          <Input
                            name="price"
                            step={0.01}
                            type="number"
                            value={price}
                            onChange={(e) => {
                              const target = e.target;
                              const branch_pricing = [...state.branch_pricing];

                              branch_pricing[index] = {
                                ...branch_pricing[index],
                                [target.name]: target.value,
                              };

                              setState((prevState) => ({
                                ...prevState,
                                branch_pricing,
                              }));
                            }}
                          />
                        );
                      },
                    },
                    {
                      title: "Wholesale",
                      dataIndex: "wholesale_price",
                      render: (wholesale_price, record, index) => {
                        return (
                          <Input
                            name="wholesale_price"
                            step={0.01}
                            type="number"
                            value={wholesale_price}
                            onChange={(e) => {
                              const target = e.target;
                              const branch_pricing = [...state.branch_pricing];

                              branch_pricing[index] = {
                                ...branch_pricing[index],
                                [target.name]: target.value,
                              };

                              setState((prevState) => ({
                                ...prevState,
                                branch_pricing,
                              }));
                            }}
                          />
                        );
                      },
                    },
                  ]}
                  pagination={false}
                />
              </Col>
            </Row>

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Unit of Measure"
                  name="unit_of_measure"
                  error={errors.unit_of_measure}
                  formItemLayout={smallFormItemLayout}
                  value={state.unit_of_measure}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value?.toUpperCase(),
                      setState,
                    });
                  }}
                  autoComplete="off"
                />
              </Col>
              <Col span={12}>
                <SimpleSelectFieldGroup
                  label="Type"
                  name="product_type"
                  value={state.product_type}
                  onChange={(value) => {
                    onChange({
                      key: "product_type",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors?.approval_status}
                  formItemLayout={smallFormItemLayout}
                  options={product_type_options}
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
