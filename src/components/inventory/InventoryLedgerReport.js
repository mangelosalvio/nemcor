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
import { addKeysToArray, onWarehouseSearch } from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import numberFormatInt from "../../utils/numberFormatInt";

const { Content } = Layout;

const url = "/api/physical-counts/";
const title = "Inventory Ledger Report";

const initialValues = {
  date: null,
  warehouse: null,
};
export default function InventoryLedgerReport() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    dates: [],
    warehouses: [],
  });

  const report = useRef(null);

  const records_column = [
    {
      title: "Stock",
      dataIndex: ["stock", "name"],
    },

    {
      title: "PC",
      dataIndex: "physical_count",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "RR.",
      dataIndex: "receiving_report",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    /* {
      title: "Releases",
      dataIndex: "stock_release",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    }, */
    {
      title: "ST.In",
      dataIndex: "stock_transfer_in",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "ST.Out",
      dataIndex: "stock_transfer_out",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "Sales",
      dataIndex: "sales",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "S.Ret.",
      dataIndex: "sales_returns",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "Cons.",
      dataIndex: "consumed_production",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "Prod.",
      dataIndex: "produced_production",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "Waste",
      dataIndex: "wastage",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "P.Ret.",
      dataIndex: "purchase_return",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "Adj.",
      dataIndex: "inventory_adjustments",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>{record.footer !== 1 && value && `${value.quantity}`}</span>
      ),
    },
    {
      title: "End Bal",
      dataIndex: "end_bal",
      align: "right",
      width: 80,
      render: (value, record) => (
        <span>
          {record.footer !== 1 && value && `${record.end_bal?.quantity || 0}`}
        </span>
      ),
    },
    {
      title: "Reorder Level",
      dataIndex: ["stock", "reorder_level"],
      align: "right",
      width: 80,
      render: (value, record) => <span>{record.footer !== 1 && value}</span>,
    },

    {
      title: "Cost",
      dataIndex: "cost",
      align: "right",
      width: 80,
      render: (value) => <span>{value && numberFormat(value)}</span>,
    },

    {
      title: "Inv.Cost",
      dataIndex: "inventory_amount",
      align: "right",
      width: 80,
      render: (value) => <span>{value && numberFormat(value)}</span>,
    },
  ];

  useEffect(() => {
    if (state.warehouse?._id) {
      axios.post(`${url}${state.warehouse._id}/dates`).then((response) => {
        setOptions((prevState) => ({
          ...prevState,
          dates: response.data,
        }));
      });
    }

    return () => {};
  }, [state.warehouse]);

  useEffect(() => {
    if (state.warehouse?._id) {
      const form_data = {
        date: state.date,
        warehouse: state.warehouse,
      };

      const loading = message.loading("Loading...");
      axios
        .post(`${url}inventory-ledger`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data.result);
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });
    }

    return () => {};
  }, [state.warehouse, state.date]);

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
                label="Warehouse"
                value={state.warehouse?.name}
                onSearch={(value) =>
                  onWarehouseSearch({ value, options, setOptions })
                }
                onChange={(index) => {
                  const warehouse = options.warehouses[index];

                  setState((prevState) => ({
                    ...prevState,
                    warehouse,
                  }));
                }}
                error={errors.warehouse}
                formItemLayout={formItemLayout}
                data={options.warehouses}
                column="name"
              />
            </Col>
            <Col span={12}>
              <SimpleSelectFieldGroup
                label="Date"
                name="date"
                value={state.date}
                onChange={(value) =>
                  setState((prevState) => ({
                    ...prevState,
                    date: value,
                  }))
                }
                error={errors.date}
                formItemLayout={formItemLayout}
                options={options.dates}
              />
            </Col>
          </Row>
        </Form>

        <Row>
          <Col span={12}>
            <Form.Item {...tailFormItemLayout} className="field is-grouped">
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
            {state?.warehouse?.name} <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
          </div>
          <div style={{ overflow: "auto" }}>
            <Table
              size="small"
              dataSource={addKeysToArray([
                ...records,
                {
                  footer: 1,
                  end_bal: sumBy(records, (o) => o.end_bal),
                  inventory_amount: sumBy(records, (o) => o.inventory_amount),
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
      </div>
    </Content>
  );
}
