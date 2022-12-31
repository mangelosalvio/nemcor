import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import { Layout, Breadcrumb, Form, Table, Divider, Row, Col } from "antd";

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
import { onBranchSearch } from "../../utils/utilities";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const url = "/api/employees/";
const title = "Employee Form";

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
const date_fields = ["date_of_birth", "date_hired", "date_released"];
export default function EmployeeForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [options, setOptions] = useState({});

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      render: (branch) => `${branch?.company?.name}-${branch?.name}`,
    },
    {
      title: "Daily Rate",
      dataIndex: "daily_rate",
      align: "right",
      render: (value) => numberFormat(value),
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
            <SelectFieldGroup
              label="Branch"
              value={
                state.branch &&
                `${state.branch?.company?.name}-${state.branch?.name}`
              }
              onSearch={(value) =>
                onBranchSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const branch = options.branches?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  branch,
                }));
              }}
              formItemLayout={formItemLayout}
              data={options.branches}
              column="display_name"
            />
            <TextFieldGroup
              label="Name"
              name="name"
              error={errors.name}
              formItemLayout={formItemLayout}
              value={state.name}
              help="E.g. <Last Name>, <First Name> ; De la Cruz, Juan"
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

            <DatePickerFieldGroup
              label="Date of Birth"
              name="date_of_birth"
              value={state.date_of_birth}
              onChange={(value) => {
                onChange({
                  key: "date_of_birth",
                  value: value,
                  setState,
                });
              }}
              error={errors.date_of_birth}
              formItemLayout={formItemLayout}
            />

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="TIN"
                  name="tin"
                  error={errors.tin}
                  formItemLayout={smallFormItemLayout}
                  value={state.tin}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  label="SSS No."
                  name="sss_no"
                  error={errors.sss_no}
                  formItemLayout={smallFormItemLayout}
                  value={state.sss_no}
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
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Philhealth No."
                  name="philhealth_no"
                  error={errors.philhealth_no}
                  formItemLayout={smallFormItemLayout}
                  value={state.philhealth_no}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  label="HDMF No."
                  name="hdmf_no"
                  error={errors.hdmf_no}
                  formItemLayout={smallFormItemLayout}
                  value={state.hdmf_no}
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

            <DatePickerFieldGroup
              label="Date Hired"
              name="date_hired"
              value={state.date_hired}
              onChange={(value) => {
                onChange({
                  key: "date_hired",
                  value: value,
                  setState,
                });
              }}
              error={errors.date_hired}
              formItemLayout={formItemLayout}
            />

            <DatePickerFieldGroup
              label="Date Released"
              name="date_released"
              value={state.date_released}
              onChange={(value) => {
                onChange({
                  key: "date_released",
                  value: value,
                  setState,
                });
              }}
              error={errors.date_of_birth}
              formItemLayout={formItemLayout}
            />

            <Row>
              <Col span={12}>
                <TextFieldGroup
                  type="number"
                  step={0.01}
                  label="Daily Rate"
                  name="daily_rate"
                  error={errors.daily_rate}
                  formItemLayout={smallFormItemLayout}
                  value={state.daily_rate}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  type="number"
                  step={0.01}
                  label="SSS Weekly Ded.."
                  name="weekly_sss_contribution"
                  error={errors.weekly_sss_contribution}
                  formItemLayout={smallFormItemLayout}
                  value={state.weekly_sss_contribution}
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
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  type="number"
                  step={0.01}
                  label="Philhealth Weekly Ded."
                  name="weekly_philhealth_contribution"
                  error={errors.weekly_philhealth_contribution}
                  formItemLayout={smallFormItemLayout}
                  value={state.weekly_philhealth_contribution}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  type="number"
                  step={0.01}
                  label="HDMF Weekly Ded."
                  name="weekly_hdmf_contribution"
                  error={errors.weekly_hdmf_contribution}
                  formItemLayout={smallFormItemLayout}
                  value={state.weekly_hdmf_contribution}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={12}>
                <TextFieldGroup
                  type="number"
                  step={0.01}
                  label="Tax Weekly Ded."
                  name="weekly_wtax"
                  error={errors.weekly_wtax}
                  formItemLayout={smallFormItemLayout}
                  value={state.weekly_wtax}
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
