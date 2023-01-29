import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Space,
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
import {
  addKeysToArray,
  onWarehouseSearch,
  onStockSearch,
  onBranchSearch,
} from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import SelectFieldGroup from "../../commons/SelectFieldGroup";

const { Content } = Layout;

const url = "/api/physical-counts/";
const title = "Stock Card Report";

const initialValues = {
  period_covered: [null, null],
  warehouse: null,
  stock: null,
};
export default function StockCardReport() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    dates: [],
    warehouses: [],
    stocks: [],
  });

  const report = useRef(null);

  const records_column = [
    {
      title: "Date",
      dataIndex: "date",
      render: (date, record) => (
        <span>{date && moment(date).format("MM/DD/YYYY")}</span>
      ),
    },
    {
      title: "Transaction",
      dataIndex: "transaction",
    },
    {
      title: "Reference",
      dataIndex: "reference",
    },
    {
      title: "Ext. Ref",
      dataIndex: "external_reference",
    },
    {
      title: "In",
      dataIndex: "quantity",
      align: "right",
      render: (o, record) => (
        <span>{record.quantity > 0 && `${numberFormat(o)}`}</span>
      ),
    },
    {
      title: "Out",
      dataIndex: "quantity",
      align: "right",
      render: (o, record) => (
        <span>{record.quantity <= 0 && `${numberFormat(Math.abs(o))}`}</span>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      align: "right",
      render: (o) => <span>{`${numberFormat(o)}`}</span>,
    },
  ];

  const getReport = useCallback(({ ...form_data }) => {
    if (
      form_data.period_covered?.[0] &&
      form_data.period_covered?.[1] &&
      form_data.branch &&
      form_data.stock?._id
    ) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}branch-stock-card`, form_data)
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
    } else {
      return message.error("All fields are required");
    }
  }, []);

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
        <Form>
          <Row>
            <Col span={12}>
              <SelectFieldGroup
                label="Branch"
                value={
                  state.branch &&
                  `${state.branch?.company?.name}-${state.branch?.name}`
                }
                onFocus={() =>
                  onBranchSearch({ value: "", options, setOptions })
                }
                onSearch={(value) =>
                  onBranchSearch({ value, options, setOptions })
                }
                onChange={(index) => {
                  const branch = options.branches?.[index] || null;
                  setState((prevState) => ({
                    ...prevState,
                    branch,
                  }));
                }}
                formItemLayout={smallFormItemLayout}
                data={options.branches}
                column="display_name"
              />
            </Col>
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
              <SelectFieldGroup
                key="1"
                label="Stock"
                value={state.stock?.name}
                onSearch={(value) =>
                  onStockSearch({ value, options, setOptions })
                }
                onChange={(index) => {
                  setState((prevState) => ({
                    ...prevState,
                    stock: options.stocks[index],
                  }));
                }}
                error={errors.stock?.name}
                formItemLayout={smallFormItemLayout}
                data={options.stocks}
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
                <Space>
                  <Button
                    onClick={() => {
                      getReport({ ...state });
                    }}
                  >
                    Search
                  </Button>
                  <ReactToPrint
                    trigger={() => (
                      <Button
                        type="primary"
                        icon={
                          <span>
                            <i className="fas print"></i>
                          </span>
                        }
                      >
                        Print
                      </Button>
                    )}
                    bodyClass="print"
                    content={() => report.current}
                  />
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <div ref={report}>
          <div className="report-heading">
            <ReportHeading />
            <span className="has-text-weight-bold">{title}</span>
            <br />
            {state.date && <div>{state.date}</div>}
            {state.branch?.company?.name || ""} {state?.branch?.name} <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
          </div>
          <div className="has-text-centered is-size-5 has-text-weight-bold">
            <div>{state.warehouse?.name}</div>
            <div>{state.stock?.name}</div>
          </div>
          <Table
            size="small"
            dataSource={addKeysToArray([...records])}
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
