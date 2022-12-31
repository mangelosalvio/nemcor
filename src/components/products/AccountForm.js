import React, { useState, useRef, useEffect } from "react";
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

const url = "/api/accounts/";
const title = "Customer Form";

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

export default function AccountForm({ stock_type }) {
  const history = useNavigate();
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [raw_material, setRawMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const raw_materials_column = [
    {
      title: "Name",
      dataIndex: ["raw_material", "name"],
    },
    {
      title: "Quantity",
      dataIndex: ["raw_material_quantity"],
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (text, record, index) => (
        <span>
          {isEmpty(state.deleted) && (
            <DeleteOutlined
              onClick={() =>
                onDeleteItem({
                  field: "raw_materials",
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
      title: "",
      key: "action",
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

    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Store",
      dataIndex: "store",
    },
    {
      title: "Location",
      dataIndex: ["location"],
    },
    {
      title: "Sales Rep.",
      dataIndex: ["sales_rep", "name"],
    },
  ];

  useEffect(() => {
    onCategorySearch({ value: "", options, setOptions, stock_type });
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
    if (!isEmpty(search_state.category)) {
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
                  value: e.target.value,
                  setState,
                });
              }}
              autoComplete="off"
            />

            <TextFieldGroup
              label="Store"
              name="store"
              error={errors.store}
              formItemLayout={formItemLayout}
              value={state.store}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="Location"
              name="location"
              error={errors.location}
              formItemLayout={formItemLayout}
              value={state.location}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <SelectFieldGroup
              label="Sales Rep."
              value={state.supplier?.name}
              onSearch={(value) => onSupplierSearch({ value, setOptions })}
              onChange={(index) => {
                const supplier = options.suppliers?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  supplier,
                }));
              }}
              formItemLayout={formItemLayout}
              data={options.suppliers}
              column="name"
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
