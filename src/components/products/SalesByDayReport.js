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
import Column from "antd/lib/table/Column";
import ColumnGroup from "antd/lib/table/ColumnGroup";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";

const { Content } = Layout;

const url = "/api/sales/";
const title = "Sales By Day Report";

const initialValues = {
  period_covered: [moment().startOf("week"), moment().endOf("week")],
};

export default function SalesByDayReport({ other_set = false, history }) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [dates, setDates] = useState([]);
  const report = useRef(null);

  useEffect(() => {
    let authenticate = other_set ? authenticateOwner : authenticateAdmin;

    authenticate({
      role: auth.user?.role,
      history,
    });

    const form_data = {
      period_covered: state.period_covered,
      other_set,
    };

    if (state.period_covered) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}sales-by-day-report`, form_data)
        .then((response) => {
          loading();
          if (response.data?.products) {
            setRecords(response.data.products);
            setDates(response.data.dates);
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });

      return () => {};
    }
  }, [state.period_covered, other_set, auth.user, history]);

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
              },
            ])}
            pagination={false}
            rowClassName={(record, index) => {
              if (record.footer === 1) {
                return "footer-summary has-text-weight-bold";
              }
            }}
          >
            <Column title="Item Description" dataIndex="name" />
            {dates.map((date, index) => (
              <ColumnGroup
                key={index}
                title={date?.[0] && moment(date?.[0]).format("ddd, MM/DD/YYYY")}
              >
                <Column
                  align="right"
                  title="Qty"
                  key={`quantity-${index}`}
                  dataIndex="product_data"
                  render={(data) => (
                    <span>
                      {data?.[index] && parseInt(data[index]?.total_quantity)}
                    </span>
                  )}
                />
                <Column
                  align="right"
                  key={`net-sales-${index}`}
                  title="Net Sales"
                  dataIndex="product_data"
                  render={(data) => (
                    <span>
                      {data?.[index] && numberFormat(data[index]?.net_sales)}
                    </span>
                  )}
                />
                <Column
                  align="right"
                  key={`net-of-vat-${index}`}
                  title="Net of Vat"
                  dataIndex="product_data"
                  render={(data) => (
                    <span>
                      {data?.[index] && numberFormat(data[index]?.net_of_vat)}
                    </span>
                  )}
                />
              </ColumnGroup>
            ))}
          </Table>
          <div className="report-heading m-t-1">
            <ReportFooter />
          </div>
        </div>
      </div>
    </Content>
  );
}
