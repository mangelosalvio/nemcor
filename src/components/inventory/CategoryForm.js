import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider } from "antd";

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

const { Content } = Layout;

const url = "/api/categories/";
const title = "Category Form";

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
};
const date_fields = ["opening_balance_date"];
export default function CategoryForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Name",
      dataIndex: "name",
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
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });
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
