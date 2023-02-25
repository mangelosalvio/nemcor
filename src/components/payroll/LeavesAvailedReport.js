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
  Input,
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
  onBranchSearch,
  onCompanySearch,
  onEmployeeSearch,
} from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import Column from "antd/lib/table/Column";
import ColumnGroup from "antd/lib/table/ColumnGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";

import CheckVoucherHeading from "../../utils/CheckVoucherHeading";
import classnames from "classnames";
import converter from "number-to-words";
import { authenticateAdmin } from "../../utils/authentications";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import { useCallback } from "react";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";

const { Content } = Layout;

const url = "/api/payroll/";
const title = "LEAVES AVAILED";

const initialValues = {
  date: moment().startOf("week").days(1),
  period_covered: [
    moment().startOf("week").days(1),
    moment().startOf("week").days(1).add({ days: 5 }).endOf("day"),
  ],
  is_cv_form: true,
};

export default function LeavesAvailedReport({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [days, setDays] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [summary, setSummary] = useState({});
  const [options, setOptions] = useState({});

  const report = useRef(null);

  const getReport = useCallback(({ ...form_data }) => {
    const source = axios.CancelToken.source();

    if (
      isEmpty(form_data?.branch?._id) ||
      isEmpty(form_data?.period_covered?.[0]) ||
      isEmpty(form_data?.period_covered?.[1])
    ) {
      return message.error("Branch and period covered are required");
    }

    if (form_data.period_covered && form_data.branch?._id) {
      const loading = message.loading("Loading...");
      axios
        .post(`${url}leave-availment-report`, form_data, {
          cancelToken: source.token,
        })
        .then((response) => {
          loading();
          if (response.data) {
            setRecords(response.data);
          }
        })
        .catch((err) => {
          loading();
          if (!axios.isCancel(err)) {
            message.error("There was an error processing your request");
          }
        });
    }
  }, []);

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });

    return () => {};
  }, [auth.user.role, history]);

  return (
    <Content className="content-padding">
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
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
              error={errors.period_covered}
              formItemLayout={smallFormItemLayout}
              onChange={(dates) =>
                setState((prevState) => ({
                  ...prevState,
                  period_covered: dates,
                }))
              }
            />
          </Col>
        </Row>
        <Row>
          {/* <Col span={24}>
            <SelectTagFieldGroup
              label="Employees"
              value={state.employees}
              onSearch={(value) =>
                onEmployeeSearch({
                  value,
                  options,
                  setOptions,
                })
              }
              onChange={(value) =>
                onChange({
                  key: "employees",
                  value,
                  setState,
                })
              }
              options={(options.employees || []).map((o) => ({
                label: o.name,
                value: o.name,
              }))}
              formItemLayout={formItemLayout}
            />
          </Col> */}
          <Col span={24}>
            <SelectFieldGroup
              label="Branch"
              value={
                state.branch &&
                `${state.branch?.company?.name}-${state.branch?.name}`
              }
              onFocus={() => onBranchSearch({ value: "", options, setOptions })}
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
              formItemLayout={formItemLayout}
              data={options.branches}
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
                    getReport({
                      ...state,
                    });
                  }}
                >
                  Search
                </Button>

                <ReactToPrint
                  trigger={() => (
                    <Button type="primary" icon={<PrinterOutlined />}>
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
        <div ref={report}>
          {records.map((o, index) => {
            return (
              <div>
                <div>
                  <table className="leave-table">
                    <tbody>
                      <tr>
                        <td colSpan={3}>
                          <div className=" leave-availed-header">
                            {o.employee?.name}
                          </div>
                        </td>
                      </tr>
                      {o.days.map((day) => {
                        return (
                          <tr>
                            <td width={150}>
                              {moment(day.date).format("MM/DD/YYYY")}
                            </td>
                            <td width={100} className="has-text-centered">
                              {day.hours}
                            </td>
                            <td width={100} className="has-text-centered">
                              {day.no_of_days}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th></th>
                        <th className="has-text-centered">
                          {sumBy(o.days, (day) => parseFloat(day.hours))} hrs
                        </th>
                        <th className="has-text-centered">
                          {sumBy(o.days, (day) => parseFloat(day.no_of_days))}{" "}
                          day(s)
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Content>
  );
}
