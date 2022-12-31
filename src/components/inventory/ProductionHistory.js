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

const url = "/api/production/";
const title = "Production History";

const initialValues = {
  period_covered: [moment().startOf("month"), moment().endOf("month")],
};
export default function ProductionHistory() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);

  const records_column = [
    {
      title: "PROD#",
      dataIndex: "production_no",
      width: 50,
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date, record) => (
        <span>{record.footer !== 1 && moment(date).format("M/D/YY")}</span>
      ),
      width: 70,
    },

    {
      title: "Consumed Case:Pc/s Qty",
      dataIndex: ["consumed_items"],
      align: "left",
      render: (items) =>
        (items || []).map((item, index) => (
          <Row key={index}>
            <Col span={8}>{item.stock.name}</Col>
            <Col span={6}>
              <span>{`${numberFormat(item?.case_quantity)} : ${numberFormat(
                item?.quantity
              )}`}</span>
            </Col>
            <Col span={6}>
              <span>{`${numberFormat(item?.case_price)} : ${numberFormat(
                item?.price
              )}`}</span>
            </Col>
            <Col span={4} className="has-text-right">
              {numberFormat(item?.amount)}
            </Col>
          </Row>
        )),
    },
    {
      title: "Produced Case:Pc/s Qty",
      dataIndex: ["produced_items"],
      align: "left",
      render: (items) =>
        (items || []).map((item, index) => (
          <Row key={index}>
            <Col span={12}>{item.stock.name}</Col>
            <Col span={4}>
              <span>{`${numberFormat(item?.case_quantity)} : ${numberFormat(
                item?.quantity
              )}`}</span>
            </Col>
            <Col span={4}>
              <span>{`${numberFormat(item?.case_price)} : ${numberFormat(
                item?.price
              )}`}</span>
            </Col>
            <Col span={4} className="has-text-right">
              {numberFormat(item?.amount)}
            </Col>
          </Row>
        )),
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
            bordered={true}
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
