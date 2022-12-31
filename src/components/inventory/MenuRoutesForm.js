import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider, Input, message } from "antd";

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
  onDeleteRecord,
} from "../../utils/form_utilities";
import { authenticateAdmin } from "../../utils/authentications";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import axios from "axios";

const { Content } = Layout;

const url = "/api/menu-routes/";
const title = "Menu Routes Form";

const initialValues = {
  name: "",
  route: "",
};
export default function MenuRoutesForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [state, setState] = useState(initialValues);

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");

  const auth = useSelector((state) => state.auth);

  const records_column = [
    {
      title: "",
      key: "action",
      width: 50,
      align: "center",
      render: (text, record, index) => (
        <span>
          <i
            className="fas fa-trash-alt"
            onClick={() =>
              onDeleteRecord({
                records,
                index,
                setRecords,
                user: auth.user,
                url,
              })
            }
          ></i>
        </span>
      ),
    },
    {
      title: "Menu",
      dataIndex: "name",
    },
    {
      title: "Route",
      dataIndex: "route",
    },
    {
      title: "Parent Menu",
      dataIndex: "parent_menu",
      render: (parent_menu, record) => (
        <Input
          defaultValue={parent_menu}
          onBlur={(e) => {
            const value = e.target.value;
            if (!isEmpty(value)) {
              axios
                .post(`/api/menu-routes/${record._id}/update-attribute`, {
                  parent_menu: value,
                })
                .then(() => {
                  message.success("Record Updated");
                })
                .catch((err) => {
                  console.error(err);
                  message.error("There was an error processing your request");
                });
            }
          }}
        />
      ),
    },
    {
      title: "Sequence",
      dataIndex: "sequence",
      width: 80,
      render: (sequence, record) => (
        <Input
          defaultValue={sequence}
          onBlur={(e) => {
            const value = e.target.value;
            if (!isEmpty(value)) {
              axios
                .post(`/api/menu-routes/${record._id}/update-attribute`, {
                  sequence: value,
                })
                .then(() => {
                  message.success("Record Updated");
                })
                .catch((err) => {
                  console.error(err);
                  message.error("There was an error processing your request");
                });
            }
          }}
        />
      ),
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
    /* authenticateAdmin({
      role: auth.user?.role,
      history,
    }); */
    return () => {};
  }, []);

  return (
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
            onFinish={(values) => {
              onSubmit({
                values: state,
                auth,
                url,
                setErrors,
                setState,
              });
            }}
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
              label="Route"
              name="route"
              error={errors.route}
              formItemLayout={formItemLayout}
              value={state.route}
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
              label="Parent Menu"
              name="parent_menu"
              error={errors.parent_menu}
              formItemLayout={formItemLayout}
              value={state.parent_menu}
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
              label="Sequence"
              name="sequence"
              error={errors.sequence}
              formItemLayout={formItemLayout}
              value={state.sequence}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
              autoComplete="off"
            />

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
                        cb: () => {
                          onSearch({
                            page: current_page,
                            search_keyword,
                            url,
                            setRecords,
                            setTotalRecords,
                            setCurrentPage,
                            setErrors,
                          });
                        },
                      });
                      setState(initialValues);
                    }}
                  >
                    <span>Delete</span>
                    <span className="icon is-small">
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
            onRow={(record, rowIndex) => {
              return {
                onDoubleClick: (e) => {
                  e.preventDefault();
                  edit({
                    record,
                    setErrors,
                    setRecords,
                    url,
                    setState,
                  });
                },
              };
            }}
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
              pageSize: 50,
            }}
          />
        )}
      </div>
    </Content>
  );
}
