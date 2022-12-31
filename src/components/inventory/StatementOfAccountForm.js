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
  date: moment(),
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
          {record.footer !== 1 && date && moment(date).format("M/D/YY")}
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
          {record.footer !== 1 && date && moment(date).format("M/D/YY")}
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
      title: "Customer",
      dataIndex: ["customer", "name"],
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
      date: state.date,
      customer: state.customer,
    };

    if (state.date) {
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
  }, [state.date, state.customer]);

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
          <Col span={8}>
            <DatePickerFieldGroup
              label="Date"
              name="date"
              value={state.date}
              onChange={(value) => {
                onChange({
                  key: "date",
                  value: value,
                  setState,
                });
              }}
              error={errors.date}
              formItemLayout={formItemLayout}
            />
          </Col>
          <Col span={8}>
            <SelectFieldGroup
              label="Customer"
              value={state.customer?.name}
              onSearch={(value) =>
                onCustomerSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const customer = options.customers[index];
                setState((prevState) => ({
                  ...prevState,
                  customer,
                }));
              }}
              error={errors.customer}
              formItemLayout={formItemLayout}
              data={options.customers}
              column="name"
            />
          </Col>
        </Row>
        <Row>
          <Col span={8}>
            <Form.Item {...tailFormItemLayout} className="field is-grouped">
              <ReactToPrint
                trigger={() => (
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    className="m-l-1"
                  >
                    Print
                  </Button>
                )}
                bodyClass="print"
                content={() => report.current}
              />
            </Form.Item>
          </Col>
        </Row>
        <div ref={report}>
          {records.map((record) => {
            return (
              <div className="page-break-after">
                <div className="has-text-centered">
                  HENG JI COMMERCIAL CORPORATION <br />
                  Rizal-Mabini Street <br />
                  Bacolod City, Neg. Occ.
                </div>

                <div className="has-text-right">
                  {moment(state.date).format("MM/DD/YYYY")}
                </div>
                <div>
                  <Row>
                    <Col span={2}>Account of:</Col>
                    <Col span={10}>{record.customer?.name}</Col>
                  </Row>
                  <Row>
                    <Col span={2}></Col>
                    <Col span={10}>{record.customer?.address}</Col>
                  </Row>
                </div>

                <div>
                  <table className="full-width">
                    <thead>
                      <tr>
                        <th>Del Date</th>
                        <th>SI#</th>
                        <th>Destination</th>
                        <th>SO#</th>
                        <th className="has-text-right">Qty</th>
                        <th>Product</th>
                        <th className="has-text-centered">U/P</th>
                        <th className="has-text-right">Amount</th>
                        <th className="has-text-right">Total Amount</th>
                        <th className="has-text-right">Payment Amount</th>
                        <th className="has-text-centered">Due Date</th>
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
                                  <td>{dr.si_no}</td>
                                  <td>{dr.delivery_area?.name}</td>
                                  <td>{dr.sales_order?.so_no}</td>
                                  <td className="has-text-right">
                                    {numberFormatInt(item.quantity)}
                                  </td>
                                  <td>{item.stock?.name}</td>
                                  <td className="has-text-centered">
                                    {numberFormat(item.price)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(item.amount)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(dr.total_amount)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(dr.total_payment_amount)}
                                  </td>
                                  <td className="has-text-centered">
                                    {moment(dr.due_date).format("MM/DD/YY")}
                                  </td>
                                </tr>
                              );
                            } else {
                              return (
                                <tr>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td className="has-text-right">
                                    {numberFormatInt(item.quantity)}
                                  </td>
                                  <td>{item.stock?.name}</td>
                                  <td className="has-text-centered">
                                    {numberFormat(item.price)}
                                  </td>
                                  <td className="has-text-right">
                                    {numberFormat(item.amount)}
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                </tr>
                              );
                            }
                          });
                        }
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th className="has-text-right">Balance</th>
                        <th className="has-text-right">
                          {numberFormat(record.balance)}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <Row>
                  <Col span={12}>
                    <div>
                      Received Original Invoices <br />
                      {record.customer?.name} <br />
                      By: ______________________
                    </div>
                  </Col>
                  <Col offset={6} span={6}>
                    <div>
                      Certified correct & payment not received <br />
                      Heng Ji Commercial Corp. <br />
                      By: ______________________
                    </div>
                  </Col>
                </Row>
              </div>
            );
          })}
        </div>
      </div>
    </Content>
  );
}
