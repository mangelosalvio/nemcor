import React, { useState, useEffect, useRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Row,
  Col,
  Button,
  Divider,
  message,
} from "antd";

import {
  formItemLayout,
  tailFormItemLayout,
  smallFormItemLayout,
  smallTailFormItemLayout,
} from "./../../utils/Layouts";
import {
  EditOutlined,
  CloseOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onChange,
} from "../../utils/form_utilities";
import ReportHeading from "../../utils/ReportHeading";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import axios from "axios";
import numberFormat from "../../utils/numberFormat";
import { addKeysToArray, onCustomerSearch } from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import numberFormatInt from "../../utils/numberFormatInt";

const { Content } = Layout;

const url = "/api/delivery-receipts/";
const title = "Statement of Account";

const initialValues = {
  period_covered: null,
  customer: null,
};
export default function StatementOfAccountForm() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    customers: [],
  });

  const report = useRef(null);

  const records_column = [
    {
      title: "Type",
      dataIndex: "type",
      width: 200,
    },
    {
      title: "Due Date",
      dataIndex: "date",
      width: 100,
      render: (date, record) => (
        <span>
          {record.footer !== 1 && date && moment(date).format("M/D/YYYY")}
        </span>
      ),
    },
    {
      title: "Ref No.",
      dataIndex: "ref_no",
      align: "center",
      width: 100,
    },
    {
      title: "DR Date",
      dataIndex: "dr_date",
      width: 100,
      render: (date, record) => (
        <span>
          {record.footer !== 1 && date && moment(date).format("M/D/YYYY")}
        </span>
      ),
    },
    {
      title: "SI No.",
      dataIndex: "si_no",
      align: "center",
      width: 100,
    },
    {
      title: "Account",
      dataIndex: ["account", "name"],
    },
    {
      title: "Aging",
      dataIndex: "aging",
      align: "right",
      width: 100,
      render: (aging, record) => <span>{record.amount > 0 && aging}</span>,
    },
    {
      title: "Open Balance",
      dataIndex: "amount",
      align: "right",
      width: 150,
      render: (value, record) => <span>{value && numberFormat(value)}</span>,
    },
  ];

  useEffect(() => {
    const form_data = {
      period_covered: state.period_covered,
      account: state.account,
      branch: state.branch,
    };

    if (state.period_covered) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}statement-of-account`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data);
            setState((prevState) => ({
              ...prevState,
              total: response.data.total,
            }));
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });

      return () => {};
    }
  }, [state.period_covered, state.account, state.branch]);

  return (
    <Content className="content-padding">
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Reports</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
        <Divider />
        <Row>
          <Col span={12}>
            <RangeDatePickerFieldGroup
              label="Period Covered"
              name="period_covered"
              value={state.period_covered}
              onChange={(dates) =>
                setState((prevState) => ({
                  ...prevState,
                  period_covered: dates,
                }))
              }
              error={errors.period_covered}
              formItemLayout={formItemLayout}
            />
          </Col>
          <Col span={12}>
            <SelectFieldGroup
              label="Account"
              value={state.account?.name}
              onSearch={(value) =>
                onCustomerSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const account = options.accounts[index];
                setState((prevState) => ({
                  ...prevState,
                  account,
                }));
              }}
              error={errors.account}
              formItemLayout={formItemLayout}
              data={options.accounts}
              column="name"
            />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <SelectFieldGroup
              label="Branch"
              value={
                state.branch &&
                `${state.branch?.company?.name}-${state.branch?.name}`
              }
              onChange={(index) => {
                const branch = auth.user?.branches?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  branch,
                }));
              }}
              formItemLayout={formItemLayout}
              data={(auth.user?.branches || []).map((o) => {
                return {
                  ...o,
                  display_name: `${o.company?.name}-${o?.name}`,
                };
              })}
              column="display_name"
              error={errors.branch}
            />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <Form.Item {...tailFormItemLayout} className="field is-grouped">
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" icon={<PrinterOutlined />}>
                    Print
                  </Button>
                )}
                bodyClass="print"
                content={() => report.current}
              />
            </Form.Item>
          </Col>
        </Row>
        <div ref={report} className="soa">
          {records.map((record) => {
            return (
              <div className="page-break-after">
                <Row>
                  <Col span={18}>
                    <div>
                      {state?.branch?.company?.logo && (
                        <div className="checkout-image">
                          <img
                            src={`/public/images/${state?.branch?.company?.logo?.filename}`}
                            style={{ height: "60px" }}
                          />
                        </div>
                      )}
                      {/* {record?.items?.[0]?.branch?.company?.name} <br /> */}
                      <div className="has-text-weight-bold">
                        {state?.branch?.address}
                      </div>{" "}
                      <div className="has-text-weight-bold">
                        {state?.branch?.contact_no}
                      </div>{" "}
                      <br />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="has-text-right has-text-weight-bold">
                      STATEMENT OF ACCOUNTS
                    </div>
                    <div className="has-text-right">
                      From:{" "}
                      {moment(state.period_covered?.[0])?.format("MM/DD/YYYY")}{" "}
                      To:{" "}
                      {moment(state.period_covered?.[1])?.format("MM/DD/YYYY")}
                    </div>
                  </Col>
                </Row>

                {/* <div className="has-text-right">
                  {moment(state.date).format("MM/DD/YYYY")}
                </div> */}
                <div>
                  <Row>
                    <Col span={3}>Account of:</Col>
                    <Col span={10} className="has-text-weight-bold">
                      {record.account?.name}
                    </Col>
                  </Row>
                  <Row>
                    <Col span={3}>Address:</Col>
                    <Col span={10}>{record.account?.address}</Col>
                  </Row>
                  <Row>
                    <Col span={3}>Contact No:</Col>
                    <Col span={10}>{record.account?.contact_no}</Col>
                  </Row>
                </div>

                <div>
                  <table className="full-width">
                    <thead>
                      <tr>
                        <th>Invoice Date</th>

                        <th>Reference</th>
                        <th>PO & DR Notes</th>
                        <th className="has-text-centered">Qty</th>
                        <th>Product</th>
                        <th className="has-text-centered">U/P</th>
                        <th className="has-text-right">Amount</th>
                        <th className="has-text-centered">Total Amount</th>
                        <th className="has-text-centered">Payment Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.items.map((dr) => {
                        {
                          return dr.items.map((item, i) => {
                            if (i === 0) {
                              return (
                                <tr>
                                  <td>{moment(dr.date).format("MM/DD/YY")}</td>

                                  <td className="red">{dr.reference}</td>
                                  <td>{dr.po_notes}</td>
                                  <td className="has-text-centered">
                                    {numberFormatInt(item.quantity)}
                                  </td>
                                  <td>{item.stock?.name}</td>
                                  <td className="has-text-centered">
                                    {numberFormat(item.price)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(item.amount)}
                                  </td>
                                  <td
                                    className="has-text-centered  has-text-weight-bold"
                                    style={{ verticalAlign: "middle" }}
                                    rowSpan={dr.items.length}
                                  >
                                    <span className="red">
                                      {numberFormat(dr.total_amount)}
                                    </span>
                                  </td>
                                  <td
                                    className="has-text-centered"
                                    style={{ verticalAlign: "middle" }}
                                    rowSpan={dr.items.length}
                                  >
                                    {numberFormat(dr.total_payment_amount)}
                                  </td>
                                  {/* <td className="has-text-centered">
                                    {moment(dr.due_date).format("MM/DD/YY")}
                                  </td> */}
                                </tr>
                              );
                            } else {
                              return (
                                <tr>
                                  <td></td>

                                  <td></td>
                                  <td></td>
                                  <td className="has-text-centered">
                                    {numberFormatInt(item.quantity)}
                                  </td>
                                  <td>{item.stock?.name}</td>
                                  <td className="has-text-centered">
                                    {numberFormat(item.price)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(item.amount)}
                                  </td>
                                </tr>
                              );
                            }
                          });
                        }
                      })}
                    </tbody>
                  </table>
                </div>
                <Row>
                  <Col span={12}>
                    <Row>
                      <Col span={8}>Prepared By:</Col>
                      <Col span={14} className="b-b-1">
                        {auth?.user?.name || ""}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}>&nbsp;</Col>
                      <Col span={14}>&nbsp;</Col>
                    </Row>
                    <Row>
                      <Col span={8}>Approved By:</Col>
                      <Col span={14} className="b-b-1">
                        &nbsp;
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}>&nbsp;</Col>
                      <Col span={14}>&nbsp;</Col>
                    </Row>
                    <Row>
                      <Col span={8}>Received By:</Col>
                      <Col span={10} className="b-b-1">
                        &nbsp;
                      </Col>
                      <Col span={2}>Date:</Col>
                      <Col span={4} className="b-b-1">
                        &nbsp;
                      </Col>
                      <Col
                        offset={8}
                        span={10}
                        className="is-italic has-text-centered"
                        style={{ fontSize: "10px" }}
                      >
                        Signature over printed name
                      </Col>
                      <Col span={24} className="is-italic">
                        Received original invoices for payment
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="has-text-centered has-text-weight-bold b-1">
                      SUMMARY OF ACCOUNTS
                    </div>
                    <Row>
                      <Col span={12} className="has-text-right">
                        Current Due:
                      </Col>
                      <Col
                        span={12}
                        className=" 
                      has-text-right has-text-weight-bold"
                      >
                        <span
                          className="red"
                          style={{
                            borderBottom: "3px double #000",
                            fontSize: "18px",
                          }}
                        >
                          {numberFormat(record.balance)}
                        </span>
                      </Col>
                    </Row>
                  </Col>
                </Row>
                {/* <div className="signatories-container">
                  <Row gutter={48}>
                    <Col span={8}>Prepared by</Col>
                    <Col span={8}>Approved by</Col>
                    <Col span={8}>Received by</Col>
                  </Row>
                  <Row gutter={48}>
                    <Col span={8}>
                      <div className="signatory">{auth?.user?.name}</div>
                    </Col>
                    <Col span={8} className="has-text-centered">
                      <div className="signatory">&nbsp;</div>
                    </Col>
                    <Col span={8}>
                      <div className="signatory">
                        Signature over Printed Name
                      </div>
                    </Col>
                  </Row>
                </div> */}
              </div>
            );
          })}
        </div>
      </div>
    </Content>
  );
}
