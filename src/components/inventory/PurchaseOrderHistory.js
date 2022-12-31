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
import { addKeysToArray } from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";

const { Content } = Layout;

const url = "/api/purchase-orders/";
const title = "Purchase Order History";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
};
export default function PurchaseOrderHistory() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);

  const records_column = [
    {
      title: "PO#",
      dataIndex: "po_no",
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date, record) => (
        <span>{record.footer !== 1 && moment(date).format("M/D/YY")}</span>
      ),
    },

    {
      title: "Supplier",
      dataIndex: ["supplier", "name"],
    },
    {
      title: "Stock",
      dataIndex: ["items", "stock", "name"],
    },
    {
      title: "PO Case:Pc/s Qty",
      dataIndex: ["items", "quantity"],
      align: "center",
      render: (value, record) => (
        <span>{`${numberFormat(record?.items?.case_quantity)} : ${numberFormat(
          value
        )}`}</span>
      ),
    },
    {
      title: "PO Status",
      align: "center",
      dataIndex: "po_status",
    },
    {
      title: "Received Case:Pc/s Qty",
      dataIndex: ["items", "received_quantity"],
      align: "center",
      render: (value, record) => (
        <span>{`${numberFormat(
          record?.items?.received_case_quantity
        )} : ${numberFormat(value)}`}</span>
      ),
    },
    {
      title: "Price",
      dataIndex: ["items", "price"],
      align: "center",
      render: (value, record) => (
        <span>
          {record.footer !== 1 &&
            `${numberFormat(record?.items?.case_price)} : ${numberFormat(
              value
            )}`}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: ["items", "amount"],
      align: "right",
      render: (value, record) => <span>{numberFormat(value)}</span>,
    },
  ];

  useEffect(() => {
    const form_data = {
      period_covered: state.period_covered,
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
  }, [state.period_covered]);

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
                  <Button
                    type="primary"
                    icon={
                      <span>
                        <i className="fas print"></i>
                      </span>
                    }
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
                items: {
                  quantity: sumBy(records, (o) => round(o.items.quantity)),
                  case_quantity: sumBy(records, (o) =>
                    round(o.items.case_quantity)
                  ),
                  received_quantity: sumBy(records, (o) =>
                    round(o.items.received_quantity)
                  ),
                  received_case_quantity: sumBy(records, (o) =>
                    round(o.items.received_case_quantity)
                  ),
                  amount: sumBy(records, (o) => round(o.items.amount)),
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
        </div>
      </div>
    </Content>
  );
}
