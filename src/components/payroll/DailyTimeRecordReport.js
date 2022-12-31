import React, { useState, useEffect, useRef, useCallback } from "react";

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
  smallFormItemLayout,
  smallTailFormItemLayout,
} from "./../../utils/Layouts";

import { useSelector } from "react-redux";

import ReportHeading from "../../utils/ReportHeading";
import ReportFooter from "../../utils/ReportFooter";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import axios from "axios";
import numberFormat from "../../utils/numberFormat";
import { addKeysToArray } from "../utils/utilities";
import round from "../../utils/round";
import { sumBy, uniqBy } from "lodash";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";
import { onChange } from "../../utils/form_utilities";

const { Content } = Layout;

const url = "/api/daily-time-records/";
const title = "Daily Time Records";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
  is_milling: false,
};
export default function DailyTimeRecordReport({ other_set = false, history }) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);

  const records_column = [
    {
      title: "Item Description",
      dataIndex: ["product"],
      sorter: (a, b) => {
        if (a.footer) return;

        return a.product.localeCompare(b.product);
      },
    },
    {
      title: "Sales Qty",
      dataIndex: ["total_quantity"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
      sorter: (a, b) => {
        if (a.footer) return;

        return a.total_quantity - b.total_quantity;
      },
    },
    {
      title: "Gross Sales",
      dataIndex: ["gross_sales"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
      sorter: (a, b) => {
        if (a.footer) return;

        return a.gross_sales - b.gross_sales;
      },
    },
    {
      title: "Net Sales",
      dataIndex: ["net_sales"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
      sorter: (a, b) => {
        if (a.footer) return;

        return a.net_sales - b.net_sales;
      },
    },
  ];

  const getReport = useCallback(({ period_covered, is_milling }) => {
    const form_data = {
      period_covered,
      is_milling,
    };

    if (state.period_covered) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}history`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data);
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });

      return () => {};
    }
  }, []);

  return (
    <Content style={{ padding: "0 50px" }}>
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
              formItemLayout={smallFormItemLayout}
            />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <CheckboxFieldGroup
              label="Is Milling"
              name="is_milling"
              formItemLayout={smallFormItemLayout}
              checked={state.is_milling}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.checked,
                  setState,
                });
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <Form.Item
              {...smallTailFormItemLayout}
              className="field is-grouped"
            >
              <Space>
                <Button
                  onClick={() => {
                    getReport({
                      period_covered: state.period_covered,
                      is_milling: state.is_milling,
                    });
                  }}
                >
                  Search
                </Button>
                <ReactToPrint
                  trigger={() => <Button type="primary">Print</Button>}
                  bodyClass="print"
                  content={() => report.current}
                />
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <div ref={report}>
          <div className="report-heading">
            <ReportHeading />
            <span className="has-text-weight-bold">{title}</span>
            <br />
            {state.period_covered?.[0] &&
              state.period_covered?.[1] &&
              `${moment(state.period_covered?.[0]).format("ll")} - ${moment(
                state.period_covered?.[1]
              ).format("ll")} `}{" "}
            <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
          </div>
          <table className="full-width">
            <thead>
              <tr>
                <th>NAME</th>
                <th>FIELD NO</th>
                <th>NATURE OF WORK</th>
                <th className="has-text-right">UNITS</th>
                <th className="has-text-right">RATES</th>
                <th className="has-text-right">GROSS</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, record_index) => [
                <tr key={record_index}>
                  <td>{moment(record.date).format("LL")}</td>
                  <td>
                    {uniqBy(record.items.map((o) => o.field_no)).join(", ")}
                  </td>
                  <td>{record.nature_of_work?.name || ""}</td>
                  <td className="has-text-right">{record.quantity_units}</td>
                  <td className="has-text-right">{record.rate_per_unit}</td>
                  <td className="has-text-right">
                    {record.gross_amount > 0 && record.gross_amount}
                  </td>
                </tr>,
                record.items.map((o, index) => {
                  return (
                    <tr key={index}>
                      <td>
                        {index + 1} {o.employee?.name}
                      </td>
                      <td>{o.field_no}</td>
                      <td>{o.work_description}</td>
                      <td className="has-text-right">
                        {o.no_of_hours > 0 && o.no_of_hours}
                      </td>
                      <td className="has-text-right">{record.rate_per_unit}</td>
                      <td className="has-text-right">
                        {numberFormat(o.amount)}
                      </td>
                    </tr>
                  );
                }),
                <tr>
                  <td colSpan={6}>&nbsp;</td>
                </tr>,
              ])}
            </tbody>
          </table>
          <div className="report-heading m-t-1">
            <ReportFooter />
          </div>
        </div>
      </div>
    </Content>
  );
}
