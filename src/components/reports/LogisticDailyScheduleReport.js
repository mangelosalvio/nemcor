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
import isEmpty from "../../validation/is-empty";

const { Content } = Layout;

const url = "/api/tanker-withdrawals/";
const title = "Logistic Daily Schedule";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
};
export default function LogisticDailyScheduleReport({
  other_set = false,
  history,
}) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [is_loading, setIsLoading] = useState(false);

  const report = useRef(null);

  useEffect(() => {
    let authenticate = other_set ? authenticateOwner : authenticateAdmin;

    authenticate({
      role: auth.user?.role,
      history,
    });
  }, [auth.user]);

  const getReport = useCallback(
    ({ ...form_data }) => {
      if (form_data.period_covered) {
        setIsLoading(true);
        axios
          .post(`${url}history`, form_data)
          .then((response) => {
            setIsLoading(false);
            if (response.data) {
              setRecords(response.data);
            }
          })
          .catch((err) => {
            setIsLoading(false);
            message.error("There was an error processing your request");
          });

        return () => {};
      }
    },
    [setIsLoading, url, setRecords]
  );

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
              <Space>
                <Button
                  loading={is_loading}
                  onClick={() => {
                    getReport({ ...state });
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

          <div className="report-container">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>DEST</th>
                  <th>QTY</th>
                  <th>P'DCT</th>
                  <th>DR</th>
                  <th>SI#</th>
                  <th>PRICE</th>
                  <th>DRIVER</th>
                  <th>TANKER</th>
                  <th>CAP'T</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {records.map((o, o_index) => [
                  <tr key={o_index}>
                    <td rowSpan={o.items.length}>
                      {moment(o.date).format("MM/DD/YY")}
                    </td>
                    {(o?.items || [])
                      .filter((item, item_index) => item_index === 0)
                      .map((item, item_index) => {
                        return [
                          <td>{item?.customer?.name}</td>,
                          <td className="has-text-centered">
                            {item?.unit?.name || item?.delivery_area}
                          </td>,
                          <td className="has-text-centered">
                            {numberFormat(item?.quantity)}
                          </td>,
                          <td className="has-text-centered">
                            {item?.stock?.name}
                          </td>,
                          <td className="has-text-centered">
                            {item?.delivery_receipts
                              .map((dr) => dr?.dr_no)
                              .join(", ")}
                          </td>,
                          <td className="has-text-centered">
                            {item?.delivery_receipts
                              .map((dr) => dr?.si_no)
                              .filter((o) => !isEmpty(o))
                              .join(", ")}
                          </td>,
                          <td className="has-text-centered">
                            {numberFormat(item?.price)}
                          </td>,
                          <td
                            rowSpan={o.items.length}
                            className="has-text-centered"
                          >
                            {o.driver?.name || ""}
                          </td>,
                          <td
                            rowSpan={o.items.length}
                            className="has-text-centered"
                          >
                            {o.tanker?.plate_no || ""}
                          </td>,
                          <td
                            rowSpan={o.items.length}
                            className="has-text-centered"
                          >
                            {numberFormat(
                              sumBy(o.items, (item) => item.quantity)
                            )}
                            /
                            {o.tanker?.capacity
                              ? numberFormat(o.tanker?.capacity)
                              : ""}
                          </td>,
                          <td
                            rowSpan={o.items.length}
                            className="has-text-centered"
                          >
                            {o.remarks || ""}
                          </td>,
                        ];
                      })}
                  </tr>,
                  (o?.items || [])
                    .filter((o, index) => index >= 1)
                    .map((item, item_index) => (
                      <tr key={item_index}>
                        <td>{item?.customer?.name}</td>
                        <td className="has-text-centered">
                          {item?.unit?.name || item?.delivery_area}
                        </td>
                        <td className="has-text-centered">
                          {numberFormat(item?.quantity)}
                        </td>
                        <td className="has-text-centered">
                          {item?.stock?.name}
                        </td>
                        <td className="has-text-centered">
                          {item?.delivery_receipts
                            .map((dr) => dr?.dr_no)
                            .join(", ")}
                        </td>
                        <td className="has-text-centered">
                          {item?.delivery_receipts
                            .map((dr) => dr?.si_no)
                            .filter((o) => !isEmpty(o))
                            .join(", ")}
                        </td>
                        <td className="has-text-centered">
                          {numberFormat(item?.price)}
                        </td>
                      </tr>
                    )),
                ])}
              </tbody>
            </table>
          </div>

          <div className="report-heading m-t-1">
            <ReportFooter />
          </div>
        </div>
      </div>
    </Content>
  );
}
