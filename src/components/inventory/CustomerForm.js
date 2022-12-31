import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  Row,
  Col,
  Input,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  tailFormItemLayout,
  threeColumnFormItemLayout,
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
  onDeleteItem,
} from "../../utils/form_utilities";

import moment from "moment";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import numberFormat from "../../utils/numberFormat";
import { authenticateAdmin } from "../../utils/authentications";
import {
  area_options,
  civil_status_options,
  kind_options,
} from "../../utils/Options";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";

import { useRef } from "react";
import AreaModal from "../modals/AreaModal";
import TextAreaGroup from "../../commons/TextAreaGroup";

const { Content } = Layout;

const url = "/api/accounts/";
const title = "Account";

const initialValues = {
  _id: null,
  name: "",
  areas: [],
};
const date_fields = [
  "date_birth",
  "date_wifey",
  "date_atm_in",
  "date_atm_out",
  "date_loan",
  "date_birth_com1",
  "date_birth_com2",
  "date_birth_com3",
  "date_wifey",
  "date_birthb1",
  "date_birthb2",
  "date_birthb3",
  "date_spend",
  "date_mature1",
  "date_mature2",
  "date_mature3",
  "tdate",
];
export default function CustomerForm({ history }) {
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

  const [page_size, setPageSize] = useState(10);
  const [state, setState] = useState(initialValues);
  const areaModal = useRef(null);
  const areasModal = useRef(null);

  const records_column = [
    {
      title: "Name",
      dataIndex: "account",
    },
    {
      title: "Branch",
      dataIndex: ["branch", "name"],
    },
    {
      title: "Claim Type",
      dataIndex: ["claim_type", "name"],
    },
    {
      title: "Bank",
      dataIndex: ["bank", "name"],
    },
    {
      title: "Date Birth",
      dataIndex: "date_birth",
      render: (date) => date && moment(date).format("MM/DD/YYYY"),
    },
    {
      title: "Pension",
      dataIndex: ["pension"],
      render: (value) => numberFormat(value),
    },
    {
      title: "Total Pension",
      dataIndex: ["totalpension"],
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
              date_fields,
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
            area,
          }));
        }}
        ref={areaModal}
      />
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
                page_size,
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
                });
              }}
            ></i>
          )}
          {title}
        </span>
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
            <Divider orientation="left">Privileged Info</Divider>

            <TextFieldGroup
              label="ATM Card #"
              name="bank_cardno"
              error={errors.bank_cardno}
              formItemLayout={formItemLayout}
              value={state.bank_cardno}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <Row>
              <Col span={12}>
                <DatePickerFieldGroup
                  label="ATM IN"
                  name="date_atm_in"
                  value={state.date_atm_in}
                  onChange={(value) => {
                    onChange({
                      key: "date_atm_in",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_atm_in}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <DatePickerFieldGroup
                  label="ATM OUT"
                  name="date_atm_out"
                  value={state.date_atm_out}
                  onChange={(value) => {
                    onChange({
                      key: "date_atm_out",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_atm_out}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>
            <TextFieldGroup
              label="PIN"
              name="bank_pin"
              error={errors.bank_pin}
              formItemLayout={formItemLayout}
              value={state.bank_pin}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <Divider orientation="left">Customer Info</Divider>

            <TextFieldGroup
              label="Name"
              name="account"
              error={errors.account}
              formItemLayout={formItemLayout}
              value={state.account}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />
            <Row>
              <Col span={12}>
                <DatePickerFieldGroup
                  label="Date of Birth"
                  name="date_birth"
                  value={state.date_birth || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_birth",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_birth}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
              <Col span={12}>
                <SimpleSelectFieldGroup
                  label="Civil Status"
                  name="civil_status"
                  value={state.civil_status}
                  onChange={(value) => {
                    onChange({
                      key: "civil_status",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors?.civil_status}
                  formItemLayout={smallFormItemLayout}
                  options={civil_status_options}
                />
              </Col>
            </Row>

            <TextAreaGroup
              label="Home Address"
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
            <Row>
              <Col span={8}>
                <TextFieldGroup
                  label="Telephone"
                  name="telno"
                  error={errors.telno}
                  formItemLayout={threeColumnFormItemLayout}
                  value={state.telno}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={8}>
                <TextFieldGroup
                  label="Basic Pension"
                  name="pension"
                  error={errors.pension}
                  formItemLayout={threeColumnFormItemLayout}
                  value={state.pension}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={8}>
                <TextFieldGroup
                  label="Excess"
                  name="salary_excess"
                  error={errors.salary_excess}
                  formItemLayout={threeColumnFormItemLayout}
                  value={state.salary_excess}
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
              <Col span={8}>
                <TextFieldGroup
                  label="SSS/GSIS No."
                  name="sss"
                  error={errors.sss}
                  formItemLayout={threeColumnFormItemLayout}
                  value={state.sss}
                  onChange={(e) => {
                    onChange({
                      key: e.target.name,
                      value: e.target.value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={8}>
                <TextFieldGroup
                  label="Total Pension"
                  name="totalpension"
                  error={errors.totalpension}
                  formItemLayout={threeColumnFormItemLayout}
                  value={state.totalpension}
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
              <Col span={8}>
                <SimpleSelectFieldGroup
                  label="Kind"
                  name="kind"
                  value={state.account_group?.name}
                  onChange={(value) => {
                    onChange({
                      key: "kind",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors?.kind}
                  formItemLayout={threeColumnFormItemLayout}
                  options={kind_options}
                />
              </Col>
            </Row>
            <Row>
              <Col span={12}>
                <TextFieldGroup
                  label="Branch"
                  name="branch"
                  error={errors.branch}
                  formItemLayout={smallFormItemLayout}
                  value={state.branch?.name}
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
                  label="Acct. Status"
                  name="account_status"
                  error={errors.account_status}
                  formItemLayout={smallFormItemLayout}
                  value={state.account_status}
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
                  label="Collection Type"
                  name="collection_type"
                  error={errors.collection_type}
                  formItemLayout={smallFormItemLayout}
                  value={state.collection_type?.name}
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
                  label="Claim"
                  name="claim"
                  error={errors.claim}
                  formItemLayout={smallFormItemLayout}
                  value={state.claim_type?.name}
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
                  label="Client Bank 1"
                  name="bank"
                  error={errors.bank}
                  formItemLayout={smallFormItemLayout}
                  value={state.bank?.name}
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
                  label="Card Expiry/Op. Date"
                  name="card_expiry"
                  error={errors.date_expiry}
                  formItemLayout={smallFormItemLayout}
                  value={state.date_expiry}
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
                  label="Client Bank 2"
                  name="bank2"
                  error={errors.bank2}
                  formItemLayout={smallFormItemLayout}
                  value={state.bank2?.name}
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
                  label="Bank Branch"
                  name="bank_branch"
                  error={errors.bank_branch}
                  formItemLayout={smallFormItemLayout}
                  value={state.bank_branch}
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
                  label="Branch Manager"
                  name="branch_manager"
                  error={errors.branch_manager?.account}
                  formItemLayout={smallFormItemLayout}
                  value={state.branch_manager}
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
                  label="Account#"
                  name="bank_account"
                  error={errors.bank_account}
                  formItemLayout={smallFormItemLayout}
                  value={state.bank_account}
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
                  label="Sales Consult"
                  name="sales_consult"
                  error={errors.sales_consult}
                  formItemLayout={smallFormItemLayout}
                  value={state.sales_consultant?.account}
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
                  label="Spouse"
                  name="spouse"
                  error={errors.spouse}
                  formItemLayout={smallFormItemLayout}
                  value={state.spouse}
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
                <DatePickerFieldGroup
                  label="Date of Birth"
                  name="date_wifey"
                  value={state.date_wifey || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_wifey",
                      value: value,
                      setState,
                    });
                  }}
                  error={errors.date_wifey}
                  formItemLayout={smallFormItemLayout}
                />
              </Col>
            </Row>

            <Divider orientation="left">Beneficiary</Divider>

            <Row gutter={4}>
              <Col span={4}>Info</Col>
              <Col span={6}>Name</Col>
              <Col span={4}>Birthdate</Col>
              <Col span={4}>Pension End</Col>
              <Col span={6}>Address</Col>
            </Row>
            <Row gutter={4}>
              <Col span={4}>Beneficiary #1</Col>
              <Col span={6}>
                <Input value={state.benefit1} />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_birthb1"
                  value={state.date_birthb1 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_birthb1",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_mature1"
                  value={state.date_mature1 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_mature1",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={6}>
                <Input value={state.benefit1_address} />
              </Col>
            </Row>
            <Row gutter={4}>
              <Col span={4}>Beneficiary #2</Col>
              <Col span={6}>
                <Input value={state.benefit2} />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_birthb2"
                  value={state.date_birthb2 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_birthb2",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_mature2"
                  value={state.date_mature2 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_mature2",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={6}>
                <Input value={state.benefit2_address} />
              </Col>
            </Row>
            <Row gutter={4}>
              <Col span={4}>Beneficiary #3</Col>
              <Col span={6}>
                <Input value={state.benefit3} />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_birthb3"
                  value={state.date_birthb3 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_birthb3",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={4}>
                <DatePickerFieldGroup
                  name="date_mature3"
                  value={state.date_mature3 || null}
                  onChange={(value) => {
                    onChange({
                      key: "date_mature3",
                      value: value,
                      setState,
                    });
                  }}
                />
              </Col>
              <Col span={6}>
                <Input value={state.benefit3_address} />
              </Col>
            </Row>

            <Divider orientation="left">Co-Maker Info</Divider>

            <Row gutter={4}>
              <Col span={4}>Info</Col>
              <Col span={8}>Name</Col>
              <Col span={6}>Relation</Col>
              <Col span={6}>Address</Col>
            </Row>

            <Row gutter={4}>
              <Col span={4}>Co-Maker 1</Col>
              <Col span={8}>
                <Input value={state.comaker1} />
              </Col>
              <Col span={6}>
                <Input value={state.relate1} />
              </Col>
              <Col span={6}>
                <Input value={state.comaker1_address} />
              </Col>
            </Row>
            <Row gutter={4}>
              <Col span={4}>Co-Maker 2</Col>
              <Col span={8}>
                <Input value={state.comaker2} />
              </Col>
              <Col span={6}>
                <Input value={state.relate2} />
              </Col>
              <Col span={6}>
                <Input value={state.comaker2_address} />
              </Col>
            </Row>
            <Row gutter={4}>
              <Col span={4}>Co-Maker 3</Col>
              <Col span={8}>
                <Input value={state.comaker3} />
              </Col>
              <Col span={6}>
                <Input value={state.relate3} />
              </Col>
              <Col span={6}>
                <Input value={state.comaker3_address} />
              </Col>
            </Row>

            <TextAreaGroup
              label="Remarks"
              name="remarks"
              error={errors.remarks}
              formItemLayout={formItemLayout}
              value={state.remarks}
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
