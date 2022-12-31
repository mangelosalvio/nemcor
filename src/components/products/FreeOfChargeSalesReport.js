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
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";

const { Content } = Layout;

const url = "/api/sales/";
const title = "Free of Charge Sales Report";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
};
export default function FreeOfChargeSalesReport({
  other_set = false,
  history,
}) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);

  const records_column = [
    {
      title: "OR #",
      dataIndex: ["sales_id"],
    },
    {
      title: "Date/Time",
      dataIndex: ["datetime"],
      render: (value) => value && moment(value).format("LLL"),
    },
    {
      title: "Name",
      dataIndex: ["name"],
    },
    {
      title: "Remarks",
      dataIndex: ["remarks"],
    },
    {
      title: "Cashier",
      dataIndex: ["user", "name"],
    },
    {
      title: "Authorized By",
      dataIndex: ["authorized_by", "name"],
    },
    {
      title: "Amount",
      dataIndex: ["amount"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
  ];

  useEffect(() => {
    let authenticate = other_set ? authenticateOwner : authenticateAdmin;

    authenticate({
      role: auth.user?.role,
      history,
    });

    const form_data = {
      other_set,
      period_covered: state.period_covered,
    };

    if (state.period_covered) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}foc-sales-report`, form_data)
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
                amount: sumBy(records, (o) => round(o.amount)),
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
