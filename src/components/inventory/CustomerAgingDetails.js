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
const title = "Customer Aging Details";

const initialValues = {
  date: moment(),
  customer: null,
};
export default function CustomerAgingDetails() {
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
      title: "Type",
      dataIndex: "type",
      width: 200,
    },
    {
      title: "Invoice Date",
      dataIndex: "date",
      width: 100,
      render: (date, record) => (
        <span>
          {record.footer !== 1 && date && moment(date).format("M/D/YYYY")}
        </span>
      ),
    },
    {
      title: "Reference",
      dataIndex: "ref_no",
      align: "center",
      width: 100,
      render: (reference, record) => (
        <span
          onClick={(e) => {
            window.open(`/charge-sales?_id=${record._id}`);
          }}
        >
          {reference}
        </span>
      ),
    },
    ,
    /* {
      title: "DR Date",
      dataIndex: "dr_date",
      width: 100,
      render: (date, record) => (
        <span>
          {record.footer !== 1 && date && moment(date).format("M/D/YY")}
        </span>
      ),
    } */ /* {
      title: "SI No.",
      dataIndex: "si_no",
      align: "center",
      width: 100,
    }, */
    {
      title: "Account",
      dataIndex: ["account", "name"],
    },
    {
      title: "Aging",
      dataIndex: "aging",
      align: "right",
      width: 100,
      render: (aging, record) => <span>{aging}</span>,
    },
    {
      title: "Open Balance",
      dataIndex: "amount",
      align: "right",
      width: 150,
      render: (value, record) => <span>{value && numberFormat(value)}</span>,
    },
  ];

  useEffect(() => {
    const form_data = {
      date: state.date,
      account: state.account,
    };

    if (state.date) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}customer-aging-details`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data.aging);
            setState((prevState) => ({
              ...prevState,
              total: response.data.total,
            }));
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });

      return () => {};
    }
  }, [state.date, state.account]);

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
          <Col span={8}>
            <SelectFieldGroup
              label="Account"
              value={state.account?.name}
              onFocus={() => {
                onCustomerSearch({ value: "", setOptions });
              }}
              onSearch={(value) => onCustomerSearch({ value, setOptions })}
              onChange={(index) => {
                const account = options.accounts?.[index] || null;
                setState((prevState) => ({
                  ...prevState,
                  account,
                }));
              }}
              formItemLayout={smallFormItemLayout}
              data={options.accounts}
              column="name"
              error={errors.account}
              onAddItem={() => accountFormModal.current.open()}
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
          {records.map((aging, index) => {
            return (
              <div key={index} className="m-t-3">
                <Table
                  title={() => (
                    <div>
                      {aging.dates.length === 2 ? (
                        <span>{`${aging.dates[0]} - ${aging.dates[1]}`}</span>
                      ) : (
                        <span>
                          {aging.dates[0] === 0
                            ? "Current"
                            : `> ${aging.dates[0]}`}
                        </span>
                      )}
                    </div>
                  )}
                  size="small"
                  dataSource={addKeysToArray([
                    ...aging.aging_transactions,
                    {
                      footer: 1,
                      amount: sumBy(aging.aging_transactions, (o) => o.amount),
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
            );
          })}
          <div className="flex aging-footer">
            <div className="flex-1">Total</div>
            <div className="flex-1">{numberFormat(state.total)}</div>
          </div>
        </div>
      </div>
    </Content>
  );
}
