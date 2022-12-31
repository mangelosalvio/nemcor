import React, { useState, useRef, useEffect } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider, Row, Col } from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
  threeColumnFormItemLayout,
} from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
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
import moment from "moment";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import numberFormat from "../../utils/numberFormat";
import {
  addKeysToArray,
  onBranchSearch,
  onRoleSearch,
  onWarehouseSearch,
} from "../../utils/utilities";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import WarehouseFormModal from "../modals/WarehouseFormModal";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { roles_options } from "../../utils/Options";
import { authenticateAdmin } from "../../utils/authentications";
import { useParams } from "react-router-dom";
import RoleFormModal from "../modals/RoleFormModal";

const { Content } = Layout;

const url = "/api/users/";
const title = "User Form";

const initialValues = {
  _id: null,
  username: "",
  name: "",
  password: "",
  password_confirmation: "",
  warehouse: null,
  role: null,
  company: null,
  division: null,
  department: null,
  expires_at: null,
};
const date_fields = ["expires_at"];
export default function UserForm({ history }) {
  const params = useParams();
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    warehouses: [],
    departments: [],
    roles: [],
  });
  const [search, setSearch] = useState(true);
  const [search_state, setSearchState] = useState({});
  const roleFormModal = useRef(null);

  const warehouseFormModal = useRef(null);

  const records_column = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Username",
      dataIndex: "username",
    },
    {
      title: "Role",
      dataIndex: "role",
    },
    {
      title: "Expires at",
      dataIndex: "expires_at",
      width: 80,
      render: (date, record) =>
        record.expires_at && moment(date).format("MM/DD/YY"),
    },

    {
      title: "",
      key: "action",
      width: 10,
      render: (text, record) => (
        <EditOutlined
          onClick={() =>
            edit({
              record,
              setErrors,
              setRecords,
              url,
              setState: (fn) => {
                setState(fn);
                setState((prevState) => ({ ...prevState, password: "" }));
              },
              date_fields,
            })
          }
        />
      ),
    },
  ];

  useEffect(() => {
    onRoleSearch({ value: "", options, setOptions });

    if (params?.id) {
      edit({
        record: { _id: params.id },
        setState,
        setErrors,
        setRecords,
        url,
        date_fields,
        setSearch,
      });
    } else {
      onSearch({
        page: 1,
        search_keyword,
        url,
        setRecords,
        setTotalRecords,
        setCurrentPage,
        setErrors,
        advance_search: { ...search_state },
        setSearch,
      });
    }

    /* authenticateAdmin({
      role: auth.user?.role,
      history,
    }); */

    return () => {};
  }, []);

  return (
    <Content className="content-padding">
      <RoleFormModal
        setField={(role) => {
          setState((prevState) => {
            return {
              ...prevState,
              role: role.name,
            };
          });
        }}
        ref={roleFormModal}
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
              onCompaniesSearch({ value: "", options, setOptions });
              onRoleSearch({ value: "", options, setOptions });
            }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={(values) =>
              onSubmit({
                values: state,
                auth,
                url,
                setErrors,
                setState,
                date_fields,
                cb: () => {
                  onSearch({
                    page: 1,
                    search_keyword,
                    url,
                    setRecords,
                    setTotalRecords,
                    setCurrentPage,
                    setErrors,
                    advance_search: { ...search_state },
                    setSearch,
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
            />

            <TextFieldGroup
              label="Username"
              name="username"
              error={errors.username}
              formItemLayout={formItemLayout}
              value={state.username}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <SimpleSelectFieldGroup
              label="Role"
              name="role"
              value={state.role}
              error={errors.role}
              formItemLayout={formItemLayout}
              onChange={(value) => {
                onChange({
                  key: "role",
                  value,
                  setState,
                });
              }}
              options={(options.roles || [])?.map((o) => o.name)}
              onAddItem={() => {
                roleFormModal.current.open();
              }}
            />

            <TextFieldGroup
              type="password"
              label="Password"
              name="password"
              error={errors.password}
              formItemLayout={formItemLayout}
              value={state.password}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <TextFieldGroup
              type="password"
              label="Confirm Password"
              name="password_confirmation"
              error={errors.password_confirmation}
              formItemLayout={formItemLayout}
              value={state.password_confirmation}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <DatePickerFieldGroup
              label="Expires at"
              name="expires_at"
              value={state.expires_at}
              onChange={(value) => {
                onChange({
                  key: "expires_at",
                  value: value ? value.endOf("day") : null,
                  setState,
                });
              }}
              error={errors.expires_at}
              formItemLayout={formItemLayout}
            />

            <SelectFieldGroup
              label="Branch"
              value={null}
              onSearch={(value) =>
                onBranchSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const branch = options.branches?.[index] || null;

                if (branch) {
                  setState((prevState) => ({
                    ...prevState,
                    branches: [...(prevState.branches || []), branch],
                  }));
                }
              }}
              error={errors.branch}
              formItemLayout={formItemLayout}
              data={options.branches}
              column="display_name"
            />
            <Row>
              <Col offset={4} span={20}>
                <Table
                  dataSource={addKeysToArray(state.branches || [])}
                  columns={[
                    {
                      title: "Company",
                      dataIndex: ["company", "name"],
                    },
                    {
                      title: "Branch",
                      dataIndex: ["name"],
                    },
                    {
                      title: "",
                      key: "action",
                      width: 100,
                      render: (text, record, index) => (
                        <span>
                          {
                            <DeleteOutlined
                              onClick={() =>
                                onDeleteItem({
                                  field: "branches",
                                  index,
                                  setState,
                                })
                              }
                            />
                          }
                        </span>
                      ),
                    },
                  ]}
                  pagination={false}
                />
              </Col>
            </Row>

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
                    <CloseOutlined />
                  </span>
                ) : null}
                <div className="control m-l-1">
                  <button
                    className="button is-small is-info"
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
                        advance_search: { ...search_state },
                        setSearch,
                      });
                    }}
                  >
                    Exit
                  </button>
                </div>
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
            onRow={(record, index) => {
              return {
                onDoubleClick: (e) => {
                  edit({
                    record,
                    setErrors,
                    setRecords,
                    url,
                    setState: (fn) => {
                      setState(fn);
                      setState((prevState) => ({ ...prevState, password: "" }));
                    },
                    date_fields,
                  });
                },
              };
            }}
          />
        )}
      </div>
    </Content>
  );
}
