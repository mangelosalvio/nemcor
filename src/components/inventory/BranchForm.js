import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider } from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";
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
import { onCompanySearch, onCustomerSearch } from "../../utils/utilities";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import TextAreaGroup from "../../commons/TextAreaGroup";

const { Content } = Layout;

const url = "/api/branches/";
const title = "Branch Form";

const initialValues = {
  _id: null,
  name: "",
};

const date_fields = [];

export default function BranchForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);

  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({});

  const records_column = [
    {
      title: "Company",
      dataIndex: ["company", "name"],
    },
    {
      title: "Branch",
      dataIndex: "name",
    },
    {
      title: "Address",
      dataIndex: "address",
    },
    {
      title: "Contact No.",
      dataIndex: "contact_no",
    },

    /* {
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
    }, */
  ];

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });
    return () => {};
  }, []);

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
            onFinish={(values) =>
              onSubmit({
                values: state,
                auth,
                url,
                setErrors,
                setState,
                clear_on_save: true,
                initial_values: { initialValues },
                cb: () => {
                  onSearch({
                    page: 1,
                    search_keyword,
                    url,
                    setRecords,
                    setTotalRecords,
                    setCurrentPage,
                    setErrors,
                  });
                },
              })
            }
            initialValues={initialValues}
          >
            <SelectFieldGroup
              label="Company"
              value={state.company?.name}
              onSearch={(value) =>
                onCompanySearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const company = options.companies?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  company,
                }));
              }}
              formItemLayout={formItemLayout}
              data={options.companies}
              column="name"
            />

            <TextFieldGroup
              label="Branch"
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
                  value: e.target.value?.toUpperCase(),
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
                  value: e.target.value?.toUpperCase(),
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="Payroll Checked by"
              name="payroll_checked_by"
              error={errors.payroll_checked_by}
              formItemLayout={formItemLayout}
              value={state.payroll_checked_by}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="Payroll Approved by"
              name="payroll_approved_by"
              error={errors.payroll_approved_by}
              formItemLayout={formItemLayout}
              value={state.payroll_approved_by}
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
                        user: auth.user,
                      });
                      setState(initialValues);
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
                  >
                    <span>Delete</span>
                    <CloseOutlined />
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
          />
        )}
      </div>
    </Content>
  );
}
