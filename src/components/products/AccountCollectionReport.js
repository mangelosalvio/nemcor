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

const url = "/api/account-collections/";
const title = "Account Collection Report";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
};
export default function AccountCollectionReport({
  other_set = false,
  history,
}) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);

  const records_column = [
    {
      title: "Date/Time",
      dataIndex: ["datetime"],
      render: (value) => <span>{value && moment(value).format("LLL")}</span>,
    },
    {
      title: "Account",
      dataIndex: ["account", "name"],
    },
    {
      title: "Items",
      dataIndex: ["items"],
      render: (items) => {
        return (
          items && (
            <span>
              OS#: {(items || []).map((o) => o?.sales?.sales_id).join("/")}
            </span>
          )
        );
      },
    },
    {
      title: "Amount",
      dataIndex: ["summary", "net_amount"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Cash",
      dataIndex: ["payments", "cash"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Credit Card",
      dataIndex: ["payments", "credit_card_total"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Cheque",
      dataIndex: ["payments", "check_total"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "Online Payment",
      dataIndex: ["payments", "online_payments_total"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "F.O.C.",
      dataIndex: ["payments", "free_of_charge_payments_total"],
      align: "right",
      render: (value) => <span>{numberFormat(value)}</span>,
    },
    {
      title: "G.C.",
      dataIndex: ["payments", "gift_checks_total"],
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
        .post(`${url}listings`, form_data)
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
                summary: {
                  net_amount: sumBy(records, (o) =>
                    round(o.summary.net_amount)
                  ),
                },
                payments: {
                  cash: sumBy(records, (o) => round(o.payments.cash)),
                  credit_card_total: sumBy(records, (o) =>
                    round(o.payments.credit_card_total)
                  ),
                  check_total: sumBy(records, (o) =>
                    round(o.payments.check_total)
                  ),
                  online_payments_total: sumBy(records, (o) =>
                    round(o.payments.online_payments_total)
                  ),
                  free_of_charge_payments_total: sumBy(records, (o) =>
                    round(o.payments.free_of_charge_payments_total)
                  ),
                  gift_checks_total: sumBy(records, (o) =>
                    round(o.payments.gift_checks_total)
                  ),
                },
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
