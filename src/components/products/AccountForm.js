import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  Row,
  Col,
  Collapse,
  PageHeader,
  Button,
  Input,
  message,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
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
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import axios from "axios";
import {
  account_type_options,
  customer_pricing_options,
} from "../../utils/Options";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import {
  ACCOUNT_TYPE_CONSIGNEE,
  ACCOUNT_TYPE_CUSTOMER,
} from "../../utils/constants";

const { Content } = Layout;
const { Panel } = Collapse;

const url = "/api/accounts/";
const title = "Account Form";

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
export default function AccountForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);
  const [options, setOptions] = useState({});
  const [search_state, setSearchState] = useState({
    branch: null,
  });

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Name",
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
    {
      title: "Account Type",
      dataIndex: "account_type",
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
                advance_search: search_state,
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

      {/* Start of Advance Search */}
      <Row>
        <Col span={24} className="m-b-1">
          <Collapse>
            <Panel header="Advance Search">
              <PageHeader
                backIcon={false}
                style={{
                  border: "1px solid rgb(235, 237, 240)",
                }}
                onBack={() => null}
                title="Advance Filter"
                subTitle="Enter appropriate data to filter records"
              >
                <div className="or-slip-form">
                  <Row>
                    <Col span={8}>
                      <SimpleSelectFieldGroup
                        label="Account Type"
                        name="account_type"
                        value={search_state.account_type}
                        onChange={(value) => {
                          onChange({
                            key: "account_type",
                            value: value,
                            setState: setSearchState,
                          });
                        }}
                        formItemLayout={smallFormItemLayout}
                        options={account_type_options}
                      />
                    </Col>
                  </Row>

                  <Row>
                    <Col span={8}>
                      <Row>
                        <Col offset={8} span={12}>
                          <Button
                            type="info"
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={() => {
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
                          >
                            Search
                          </Button>
                        </Col>
                      </Row>
                    </Col>
                    <Col span={8}></Col>
                    <Col span={8}></Col>
                  </Row>
                </div>
              </PageHeader>
            </Panel>
          </Collapse>
        </Col>
      </Row>
      {/* End of Advanced Search */}

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
            <TextFieldGroup
              label="Business Style"
              name="business_style"
              error={errors.business_style}
              formItemLayout={formItemLayout}
              value={state.business_style}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <TextFieldGroup
              label="TIN"
              name="tin"
              error={errors.tin}
              formItemLayout={formItemLayout}
              value={state.tin}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <SimpleSelectFieldGroup
              label="Account Type"
              name="account_type"
              value={state.account_type}
              onChange={(value) => {
                onChange({
                  key: "account_type",
                  value: value,
                  setState,
                });
              }}
              error={errors?.account_type}
              formItemLayout={formItemLayout}
              options={account_type_options}
            />

            {[ACCOUNT_TYPE_CONSIGNEE, ACCOUNT_TYPE_CUSTOMER].includes(
              state.account_type
            ) && (
              <SimpleSelectFieldGroup
                label="Pricing Type"
                name="pricing_type"
                value={state.pricing_type}
                onChange={(value) => {
                  onChange({
                    key: "pricing_type",
                    value: value,
                    setState,
                  });
                }}
                error={errors?.pricing_type}
                formItemLayout={formItemLayout}
                options={customer_pricing_options}
              />
            )}

            <Form.Item className="m-t-1" {...tailFormItemLayout}>
              <div className="field is-grouped">
                <div className="control">
                  <button className="button is-small is-primary">Save</button>
                </div>
                {!isEmpty(state._id) ? (
                  <span
                    className="button control is-danger is-outlined is-small"
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
                <span
                  className="button is-outlined is-small control"
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
                >
                  <span>Exit</span>
                </span>
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
              pageSize: 10,
            }}
          />
        )}
      </div>
    </Content>
  );
}
