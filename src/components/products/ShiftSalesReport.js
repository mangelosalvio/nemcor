import React, { useState, useEffect, useRef } from "react";

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
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import { onChange } from "../../utils/form_utilities";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const url = "/api/sales/";
const title = "Shift Sales Report";

const initialValues = {
  date: moment(),
};
export default function ShiftSalesReport({ other_set = false, history }) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    xreads: [],
  });

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
  useEffect(() => {
    if (state.date) {
      axios
        .post("/api/sales/get-xreads", {
          date: state.date,
        })
        .then((response) => {
          if (response.data) {
            setOptions((prevState) => ({
              ...prevState,
              xreads: [...response.data],
            }));
          }
        })
        .catch((err) => {
          message.error("There was an error processing your request");
          l;
        });
    }

    return () => {};
  }, [state.date]);

  useEffect(() => {
    let authenticate = other_set ? authenticateOwner : authenticateAdmin;

    authenticate({
      role: auth.user?.role,
      history,
    });

    if (state.date && state.xread?._id) {
      const form_data = {
        other_set,
        from_datetime: state.xread?.from_datetime,
        to_datetime: state.xread?.to_datetime,
      };
      const loading = message.loading("Loading...");
      axios
        .post(`${url}shift-sales-report`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data.records);
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });

      return () => {};
    }
  }, [state.date, state.xread, other_set, auth.user, history]);

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
            <DatePickerFieldGroup
              label="Date"
              name="date"
              value={state.date || null}
              onChange={(value) => {
                onChange({
                  key: "date",
                  value: value,
                  setState,
                });
              }}
              formItemLayout={smallFormItemLayout}
            />
          </Col>
          <Col span={12}>
            <SelectFieldGroup
              label="Period"
              value={
                state.xread &&
                `${moment(state.xread.from_datetime).format(
                  "hh:mm A"
                )} - ${moment(state.xread.to_datetime).format("hh:mm A")}`
              }
              onChange={(index) => {
                const xread = options.xreads?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  xread,
                }));
              }}
              formItemLayout={smallFormItemLayout}
              data={options.xreads}
              column="display_name"
            />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <Form.Item
              {...smallTailFormItemLayout}
              className="field is-grouped"
            >
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" className="m-l-1">
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
          <Table
            size="small"
            dataSource={addKeysToArray([
              ...records,
              {
                footer: 1,
                total_quantity: sumBy(records, (o) => round(o.total_quantity)),
                net_sales: sumBy(records, (o) => round(o.net_sales)),
                gross_sales: sumBy(records, (o) => round(o.gross_sales)),
                net_of_vat: sumBy(records, (o) => round(o.net_of_vat)),
              },
            ])}
            columns={records_column}
            pagination={false}
            rowClassName={(record, index) => {
              if (record.footer === 1) {
                return "footer-summary has-text-weight-bold";
              }
            }}
          />
          <div className="report-heading m-t-1">
            <ReportFooter />
          </div>
        </div>
      </div>
    </Content>
  );
}
