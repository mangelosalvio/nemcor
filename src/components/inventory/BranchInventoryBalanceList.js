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
  List,
  Space,
} from "antd";

import {
  formItemLayout,
  tailFormItemLayout,
  smallFormItemLayout,
  smallTailFormItemLayout,
} from "../../utils/Layouts";

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

import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import numberFormatInt from "../../utils/numberFormatInt";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import Item from "antd/lib/list/Item";
import CheckboxGroupFieldGroup from "../../commons/CheckboxGroupFieldGroup";

import { addKeysToArray, onBranchSearch } from "../../utils/utilities";

const { Content } = Layout;

const url = "/api/physical-counts/";
const title = "Inventory Balance Report";

const initialValues = {
  date: moment(),
  warehouse: null,
  categories: [],
};
export default function BranchInventoryBalanceList() {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    dates: [],
    warehouses: [],
  });
  const [categories, setCategories] = useState([]);

  const report = useRef(null);

  const records_column = [
    {
      title: "Item",
      dataIndex: ["stock", "name"],
    },

    {
      title: "End Bal",
      dataIndex: "quantity",
      width: 100,
      align: "right",
      render: (value) => numberFormat(value),
    },
  ];

  useEffect(() => {
    axios.get(`/api/categories`).then((response) => {
      if (response.data) {
        setCategories(response.data.map((o) => o.name));
      }
    });

    return () => {};
  }, []);

  const getReport = useCallback(({ ...form_data }) => {
    if (form_data.date && form_data.branch) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}branch-inventory-balance-list`, form_data)
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
      return message.error("Date and branch are required");
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
            <Col span={24}>
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
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item {...tailFormItemLayout} className="field is-grouped">
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
        <div ref={report} className="report-container">
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
            {state.branch?.company?.name || ""} {state?.branch?.name} <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
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
