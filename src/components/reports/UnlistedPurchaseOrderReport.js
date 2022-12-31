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
  onSupplierSearch,
} from "../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import isEmpty from "../../validation/is-empty";
import {
  payment_status_options,
  payment_type_options,
} from "../../utils/Options";
import classNames from "classnames";

const { Content } = Layout;

const url = "/api/purchase-orders/";
const title = "Unlisted PO Report";

const initialValues = {
  period_covered: null,
};
export default function UnlistedPurchaseOrderReport({
  other_set = false,
  history,
}) {
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

  const setPaymentStatus = useCallback(
    ({ _id, payment_status, user, index }) => {
      axios
        .post(`/api/customer-collections/${_id}/update-payment-status`, {
          _id,
          payment_status,
          user,
        })
        .then((response) => {
          const _payment_status = { ...response.data };
          if (_payment_status) {
            setRecords((prevRecords) => {
              const _records = [...prevRecords];
              _records[index] = {
                ..._records[index],
                payment_status: _payment_status,
              };

              return [..._records];
            });
          }
        })
        .catch((err) =>
          message.error("There was an error processing your request")
        );
    },
    [setRecords]
  );

  const getReport = useCallback(
    ({ ...form_data }) => {
      setIsLoading(true);
      axios
        .post(`${url}unlisted-purchase-order-report`, form_data)
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
              label="Supplier"
              value={state.supplier?.name}
              onSearch={(value) =>
                onSupplierSearch({ value, options, setOptions })
              }
              onChange={(index) => {
                const supplier = options.suppliers?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  supplier,
                }));
              }}
              formItemLayout={smallFormItemLayout}
              data={options.suppliers}
              column="name"
            />
          </Col>
          {/* <Col span={12}>
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
          </Col> */}
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
                  <th>PO#</th>
                  <th>DATE</th>
                  <th>SUPPLIER</th>
                  <th>ITEM</th>
                  <th>QTY</th>
                  <th>W/D QTY</th>
                  <th>PRICE</th>
                  <th className="has-text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {records.map((o, o_index) => (
                  <tr key={o_index}>
                    <td className="has-text-centered">{o.po_no}</td>
                    <td className="has-text-centered">
                      {moment(o.date).format("MM/DD/YY")}
                    </td>
                    <td className="has-text-centered">{o.supplier?.name}</td>
                    <td className="has-text-centered">{o.stock?.name}</td>
                    <td className="has-text-centered">{o.quantity}</td>
                    <td className="has-text-centered">
                      {o.confirmed_quantity}
                    </td>
                    <td className="has-text-centered">
                      {numberFormat(o.price)}
                    </td>
                    <td className="has-text-right">{numberFormat(o.amount)}</td>
                  </tr>
                ))}
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
