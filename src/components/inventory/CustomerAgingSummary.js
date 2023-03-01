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
import { addKeysToArray, onCustomerSearch } from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";

const { Content } = Layout;

const url = "/api/delivery-receipts/";
const title = "Customer Aging Summary";

const initialValues = {
  date: moment(),
};
export default function CustomerAgingSummary() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    customers: [],
  });

  const report = useRef(null);

  const records_column = [
    {
      title: "Account",
      dataIndex: ["name"],
    },
    {
      title: "Current",
      dataIndex: "Current",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "1-7",
      dataIndex: "1-7",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "8-15",
      dataIndex: "8-15",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "16-30",
      dataIndex: "16-30",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "31-45",
      dataIndex: "31-45",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "46-60",
      dataIndex: "46-60",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: ">60",
      dataIndex: ">60",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
    {
      title: "Total",
      dataIndex: "total",
      align: "right",
      width: 100,
      render: (amount, record) => <span>{numberFormat(amount)}</span>,
    },
  ];

  useEffect(() => {
    const form_data = {
      date: state.date,
    };

    if (state.date) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}customer-aging-summary`, form_data)
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
  }, [state.date]);

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
          <Col span={8}>
            <DatePickerFieldGroup
              label="Date"
              name="date"
              value={state.date}
              onChange={(value) => {
                onChange({
                  key: "date",
                  value: value,
                  setState,
                });
              }}
              error={errors.date}
              formItemLayout={formItemLayout}
            />
          </Col>
        </Row>
        <Row>
          <Col span={8}>
            <Form.Item {...tailFormItemLayout} className="field is-grouped">
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" icon={<PrinterOutlined />}>
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
            {moment(state.date).format("ll")} <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
          </div>

          <Table
            size="small"
            dataSource={addKeysToArray([
              ...records,
              {
                footer: 1,
                Current: sumBy(records, (o) => o["Current"]),
                "1-7": sumBy(records, (o) => o["1-7"]),
                "8-15": sumBy(records, (o) => o["8-15"]),
                "16-30": sumBy(records, (o) => o["16-30"]),
                "31-45": sumBy(records, (o) => o["31-45"]),
                "46-60": sumBy(records, (o) => o["46-60"]),
                ">60": sumBy(records, (o) => o[">60"]),
                total: sumBy(records, (o) => o["total"]),
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
