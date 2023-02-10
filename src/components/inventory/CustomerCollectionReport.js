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
  Space,
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
import { useCallback } from "react";

const { Content } = Layout;

const url = "/api/customer-collections/";
const title = "Customer Collection Report";

const initialValues = {
  period_covered: [moment(), moment()],
};
export default function CustomerCollectionReport() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    customers: [],
  });

  const report = useRef(null);

  useEffect(() => {
    const branch = auth?.user?.branches?.[0] || null;

    if (branch?._id) {
      setState((prevState) => {
        return {
          ...prevState,
          branch,
        };
      });
    }

    setOptions((prevState) => {
      return {
        ...prevState,
        branches: auth?.user?.branches || [],
      };
    });

    return () => {};
  }, [auth.user.branches]);

  const getReport = useCallback(({ period_covered, branch, account }) => {
    if (period_covered) {
      const form_data = {
        period_covered,
        branch,
        account,
      };

      const loading = message.loading("Loading...");
      axios
        .post(`${url}customer-collection-report`, form_data)
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
    }
  }, []);

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
              <Space>
                <Button
                  onClick={() => {
                    getReport({
                      ...state,
                    });
                  }}
                >
                  Search
                </Button>
                <ReactToPrint
                  trigger={() => (
                    <Button type="primary" icon={<PrinterOutlined />}>
                      Print
                    </Button>
                  )}
                  bodyClass="print"
                  content={() => report.current}
                />
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <div ref={report}>
          <div>
            <div className="has-text-weight-bold">
              Customer Collection Report
            </div>
            <div>
              Period Covered: {state.period_covered?.[0]?.format("MM/DD/YYYY")}{" "}
              to {state.period_covered?.[1]?.format("MM/DD/YYYY")}
            </div>
            <div>
              {state.branch?.company?.name || ""} - {state.branch?.name || ""}
            </div>
          </div>
          <table className="full-width sales-report-table m-t-1">
            <thead>
              <tr>
                <th width={120}>Date</th>
                <th>Col#</th>
                <th width={100}>Ref</th>
                <th>Account</th>
                <th>Bank</th>
                <th>Check No.</th>
                <th>Check Date</th>
                <th>Reference</th>
                <th className="has-text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                return [
                  <tr className="tr-head" key="head">
                    <td rowSpan={record.payments.length + 1}>
                      <div>{moment(record.date).format("MM/DD/YY")}</div>
                      <div>
                        {record.branch?.company?.company_code}{" "}
                        {record.branch?.name}
                      </div>
                    </td>
                    <td>{record.collection_no}</td>
                    <td>{record.reference}</td>
                    <td>{record.account?.name}</td>
                    <td>
                      {record.delivery_items.map((o) => o.reference).join(", ")}
                    </td>
                    <td />
                    <td />
                  </tr>,
                  (record.payments || []).map((item) => {
                    return (
                      <tr>
                        <td></td>
                        <td></td>
                        <td>{item.payment_method}</td>
                        <td>{item.bank}</td>
                        <td>{item.check_no}</td>
                        <td>
                          {item.check_date &&
                            moment(item.check_date).format("MM/DD/YYYY")}
                        </td>
                        <td>{item.reference}</td>

                        <td className="has-text-right">
                          {numberFormat(item.amount)}
                        </td>
                      </tr>
                    );
                  }),
                  <tr className="tr-footer" key="footer">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>

                    <td />
                    <td className="has-text-right">
                      {numberFormat(sumBy(record.payments, (o) => o.amount))}
                    </td>
                  </tr>,
                ];
              })}
              <tr className="footer">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="has-text-right">GRAND TOTAL</th>
                <th className="has-text-right">
                  {numberFormat(
                    sumBy(records, (record) =>
                      sumBy(record.payments, (o) => parseFloat(o.amount || 0))
                    )
                  )}
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Content>
  );
}
