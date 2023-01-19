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
const title = "Wholesale Pricing Form";

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

export default function WholesaleStockBranchPricingForm({ stock_type }) {
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
    ...[
      ...(branches || [])?.map((branch) => {
        return {
          title: `${branch?.company?.company_code} ${branch.name}`,
          width: 80,
          key: "branch_pricing",
          align: "center",
          render: (value, record) => {
            const branch_price =
              (record.branch_pricing || [])?.filter((o) => {
                return o.branch?._id === branch?._id;
              })?.[0]?.wholesale_price || "";

            return (
              <span>
                <Input
                  defaultValue={branch_price}
                  className="table-input-price"
                  onBlur={(e) => {
                    axios
                      .post(
                        `/api/products/${record._id}/branch-wholesale-price`,
                        {
                          price: e.target.value,
                          branch,
                        }
                      )
                      .then(() =>
                        message.success(
                          `${record.name} ${branch.name} price updated`
                        )
                      )
                      .catch((err) => console.log(err));
                  }}
                />
              </span>
            );
          },
        };
      }),
    ],
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
      </div>
    </Content>
  );
}
