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
import {
  addKeysToArray,
  onCustomerSearch,
  onStockSearch,
} from "../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const url = "/api/sales-orders/";
const title = "Sales Orders Report";

const initialValues = {
  period_covered: [moment().startOf("day"), moment().endOf("day")],
};
export default function SalesOrdersReport({ other_set = false, history }) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [is_loading, setIsLoading] = useState(false);
  const [options, setOptions] = useState({
    suppliers: [],
    stocks: [],
    purchase_orders: [],
    warehouses: [],
  });
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
          <Col span={12}>
            <SelectFieldGroup
              label="Customer"
              value={state.customer?.name}
              onSearch={(value) =>
                onCustomerSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const customer = options.customers?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  customer,
                }));
              }}
              formItemLayout={smallFormItemLayout}
              data={options.customers}
              column="name"
            />
          </Col>
          <Col span={12}>
            <SelectFieldGroup
              label="Item"
              value={state.stock?.name}
              onSearch={(value) =>
                onStockSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const stock = options.stocks?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  stock,
                }));
              }}
              formItemLayout={smallFormItemLayout}
              data={options.stocks}
              column="name"
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
                  <th>SO#</th>
                  <th>DATE</th>
                  <th>DATE NEEDED</th>
                  <th>CUSTOMER</th>
                  <th>DR AREA</th>
                  <th>DR TYPE</th>
                  <th>QTY</th>
                  <th>W/D</th>
                  <th>P'DCT</th>
                  <th>PRICE</th>
                  <th>AMOUNT</th>
                  <th>OPEN QTY</th>
                </tr>
              </thead>
              <tbody>
                {records.map((o, o_index) => (
                  <tr key={o_index}>
                    <td className="has-text-centered">{o.so_no}</td>
                    <td className="has-text-centered">
                      {moment(o.date).format("MM/DD/YY")}
                    </td>
                    <td className="has-text-centered">
                      {moment(o.date_needed).format("MM/DD/YY")}
                    </td>
                    <td>{o.customer?.name}</td>
                    <td className="has-text-centered">
                      {o?.items?.unit?.name || o.delivery_area?.name}
                    </td>
                    <td className="has-text-centered">{o.delivery_type}</td>
                    <td className="has-text-right">
                      {numberFormat(o.items.quantity)}
                    </td>
                    <td className="has-text-right">
                      {numberFormat(o.items.confirmed_quantity)}
                    </td>
                    <td className="has-text-centered">
                      {o.items?.stock?.name}
                    </td>
                    <td className="has-text-right">
                      {numberFormat(o.items.price)}
                    </td>
                    <td className="has-text-right">
                      {numberFormat(o.items.amount)}
                    </td>
                    <td className="has-text-centered">
                      {o.items?.is_open_quantity && "YES"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th className="has-text-right">
                    {numberFormat(
                      sumBy(records, (record) => record?.items?.quantity)
                    )}
                  </th>
                  <th className="has-text-right">
                    {numberFormat(
                      sumBy(
                        records,
                        (record) => record?.items?.confirmed_quantity
                      )
                    )}
                  </th>
                  <th></th>
                  <th></th>
                  <th className="has-text-right">
                    {numberFormat(
                      sumBy(records, (record) => record?.items?.amount)
                    )}
                  </th>
                </tr>
              </tfoot>
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
