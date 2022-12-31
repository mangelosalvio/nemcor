import React, { useEffect, useRef, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider, Row, Col } from "antd";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined } from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onChange,
} from "../../utils/form_utilities";
import moment from "moment";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import numberFormat from "../../utils/numberFormat";
import { authenticateAdmin } from "../../utils/authentications";
import { terms_options } from "../../utils/Options";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import { addKeysToArray, onCategorySearch } from "../utils/utilities";
import { onAreaSearch } from "../../utils/utilities";
import AreaModal from "../modals/AreaModal";

const { Content } = Layout;

const url = "/api/suppliers/";
const title = "Supplier Form";

const initialValues = {
  _id: null,
  name: "",
  address: "",
  owner: "",
  contact_no: "",
  terms: "",
  opening_balance: 0,
  opening_balance_date: moment(),
  terms_in_days: null,
  areas: [],
  product_categories: [],
};
const date_fields = ["opening_balance_date"];
export default function SupplierForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [options, setOptions] = useState({
    locations: [],
    agents: [],
  });

  const areasModal = useRef(null);

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Company Name",
      dataIndex: "name",
    },
    {
      title: "Address",
      dataIndex: "address",
    },
    {
      title: "Owner",
      dataIndex: "owner",
    },
    {
      title: "Contact No.",
      dataIndex: "contact_no",
    },
    {
      title: "Terms Desc",
      dataIndex: "terms",
    },
    {
      title: "Delivery Area",
      dataIndex: ["areas"],
      render: (items) => items.map((o) => o.name).join(", "),
    },
    /* {
      title: "Terms in Days",
      dataIndex: "terms_in_days",
      align: "center",
    },
    {
      title: "Opening Balance",
      dataIndex: "opening_balance",
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "As of",
      dataIndex: "opening_balance_date",
      align: "center",
      render: (date) => (
        <span>{date && moment(date).format("MM/DD/YYYY")}</span>
      ),
    }, */
    {
      title: "",
      key: "action",
      width: 10,
      render: (text, record) => (
        <span
          onClick={() =>
            edit({
              record,
              setErrors,
              setRecords,
              url,
              setState,
            })
          }
        >
          <i className="fas fa-edit"></i>
        </span>
      ),
    },
  ];

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });
    return () => {};
  }, []);

  return (
    <Content className="content-padding">
      <AreaModal
        setField={(area) => {
          setState((prevState) => ({
            ...prevState,
            areas: [...(prevState.areas || []), area],
          }));
        }}
        ref={areasModal}
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
              setRecords([]);
              setState(initialValues);
            }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
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
              });
            }}
            initialValues={initialValues}
          >
            <TextFieldGroup
              label="Company Name"
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
            />
            <TextFieldGroup
              label="Address"
              name="address"
              error={errors.address}
              formItemLayout={formItemLayout}
              value={state.address}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <TextFieldGroup
              label="Owner"
              name="owner"
              error={errors.owner}
              formItemLayout={formItemLayout}
              value={state.owner}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <TextFieldGroup
              label="Contact No."
              name="contact_no"
              error={errors.contact_no}
              formItemLayout={formItemLayout}
              value={state.contact_no}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <SimpleSelectFieldGroup
              label="Terms"
              name="terms"
              value={state.terms}
              onChange={(value) => {
                onChange({
                  key: "terms",
                  value: value,
                  setState,
                });
              }}
              error={errors?.terms}
              formItemLayout={formItemLayout}
              options={terms_options}
            />

            <Row>
              <Col span={24}>
                <SelectFieldGroup
                  label="Delivery Areas"
                  value={null}
                  onSearch={(value) =>
                    onAreaSearch({
                      value,
                      options,
                      setOptions,
                    })
                  }
                  onChange={(index) => {
                    const area = options.areas?.[index] || null;
                    if (area) {
                      setState((prevState) => ({
                        ...prevState,
                        areas: [...prevState.areas, area],
                      }));
                    }
                  }}
                  error={errors.area}
                  formItemLayout={formItemLayout}
                  data={options.areas}
                  column="name"
                  onAddItem={() => areasModal.current.open()}
                />
              </Col>
              <Col offset={4} span={20}>
                <Table
                  dataSource={addKeysToArray([...state.areas])}
                  columns={[
                    {
                      title: "Area",
                      dataIndex: ["name"],
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
                                    field: "areas",
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

            <Row>
              <Col span={24}>
                <SelectFieldGroup
                  label="Product Categories"
                  value={null}
                  onSearch={(value) =>
                    onCategorySearch({
                      value,
                      options,
                      setOptions,
                    })
                  }
                  onChange={(index) => {
                    const category = options.categories?.[index] || null;
                    if (category) {
                      setState((prevState) => ({
                        ...prevState,
                        product_categories: [
                          ...(prevState.categories || []),
                          category,
                        ],
                      }));
                    }
                  }}
                  error={errors.category}
                  formItemLayout={formItemLayout}
                  data={options.categories}
                  column="name"
                />
              </Col>
              <Col offset={4} span={20}>
                <Table
                  dataSource={addKeysToArray([
                    ...(state.product_categories || []),
                  ])}
                  columns={[
                    {
                      title: "Category",
                      dataIndex: ["name"],
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
                                    field: "product_categories",
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

            {/* <TextFieldGroup
              type="number"
              label="Terms in days"
              name="terms_in_days"
              error={errors.terms_in_days}
              formItemLayout={formItemLayout}
              value={state.terms_in_days}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            /> */}

            {/* <Divider orientation="left">Opening Balance</Divider>

            <TextFieldGroup
              label="Balance"
              name="opening_balance"
              error={errors.opening_balance}
              formItemLayout={formItemLayout}
              value={state.opening_balance}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <DatePickerFieldGroup
              label="As of"
              name="opening_balance_date"
              value={state.opening_balance_date}
              onChange={(value) => {
                onChange({
                  key: "opening_balance_date",
                  value: value,
                  setState,
                });
              }}
              error={errors.opening_balance_date}
              formItemLayout={formItemLayout}
            /> */}

            <Form.Item className="m-t-1" {...tailFormItemLayout}>
              <div className="field is-grouped">
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
                      setState(initialValues);
                    }}
                  >
                    <span>Delete</span>
                    <span>
                      <i className="fas fa-times"></i>
                    </span>
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
