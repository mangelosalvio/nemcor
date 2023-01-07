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
const title = "PAYSLIP VOUCHER";

const initialValues = {
  date: moment().startOf("week").days(1),
  period_covered: [
    moment().startOf("week").days(1),
    moment().startOf("week").days(1).add({ days: 5 }).endOf("day"),
  ],
  is_cv_form: true,
};

export default function PayrollCheckVoucherForm({ history }) {
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
        .post(`${url}period-report`, form_data, {
          cancelToken: source.token,
        })
        .then((response) => {
          loading();
          if (response.data.payroll) {
            setRecords(response.data.payroll);
            setDays(response.data.days);
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

  useEffect(() => {
    setSummary({
      daily_financial_assistance: sumBy(records, (o) =>
        round(o.daily_financial_assistance)
      ),
      total_reg_no_of_days: sumBy(records, (o) =>
        round(o.total_reg_no_of_days)
      ),
      gross_financial_assistance: sumBy(records, (o) =>
        round(o.gross_financial_assistance)
      ),
      ot_hours_financial_assistance: sumBy(records, (o) =>
        round(o.ot_hours_financial_assistance)
      ),
      ot_amount_financial_assistance: sumBy(records, (o) =>
        round(o.ot_amount_financial_assistance)
      ),
      late_hours_financial_assistance: sumBy(records, (o) =>
        round(o.late_hours_financial_assistance)
      ),
      late_amount_financial_assistance: sumBy(records, (o) =>
        round(o.late_amount_financial_assistance)
      ),
      net_financial_assistance: sumBy(records, (o) =>
        round(o.net_financial_assistance)
      ),
      net_salary_pay: sumBy(records, (o) => round(o.net_salary_pay)),
    });

    return () => {};
  }, [records]);

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
            <DatePickerFieldGroup
              label="Date"
              name="date"
              value={state.date}
              error={errors.date}
              formItemLayout={smallFormItemLayout}
              onChange={(date) => {
                if (date) {
                  setState((prevState) => ({
                    ...prevState,
                    date,
                    period_covered: [
                      date.clone().startOf("day"),
                      date.clone().add(5, "days").endOf("day"),
                    ],
                  }));
                } else {
                  setState((prevState) => {
                    return {
                      ...prevState,
                      period_covered: null,
                      date,
                    };
                  });
                }
              }}
              disabledDate={(current) => {
                return current && current.days() !== 1;
              }}
            />
          </Col>
        </Row>
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
                  period_covered:
                    dates[0] && dates[1]
                      ? [dates[0], dates[0].clone().add(6, "days").endOf("day")]
                      : undefined,
                }))
              }
              disabledDate={(current) => {
                return current && current.days() !== 0;
              }}
              disabled={[true, true]}
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
                    <Button
                      type="primary"
                      icon={<PrinterOutlined />}
                      className="m-l-1"
                      bodyClass="print-no-margin"
                    >
                      Print
                    </Button>
                  )}
                  content={() => report.current}
                />
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <div ref={report}>
          {records.map((o, index) => {
            const days_leave = (o?.days || [])
              .filter((o) => o.leave_availed)
              .map((day, i) => {
                return `${moment(day.date).format("MM/DD/YYYY")}`;
              });

            const net_salary_pay = round(o.net_salary_pay);
            const cents = net_salary_pay?.toString().split(".")?.[1] || 0;

            return ["Original Copy", "Employee's Copy"].map(
              (copy, copy_index) => (
                <div
                  key={`${copy} ${index}`}
                  className={classnames(
                    `report-heading payroll-check-voucher payroll-check-voucher-${
                      copy_index % 2
                    }`,
                    {
                      "first-page": index === 0 && copy_index === 0,
                      "page-break-after": copy === "Employee's Copy",
                      "bottom-border-dashed": copy === "Original Copy",
                    }
                  )}
                >
                  <CheckVoucherHeading
                    title="PAYSLIP VOUCHER"
                    type_of_copy={copy}
                    branch={o.employee?.branch}
                  />
                  <Row className="cv-reference">
                    {/* <Col span={12} className="is-flex align-items-flex-end">
                  Payee : {o?.employee?.name}
                </Col> */}
                    <Col offset={18} span={6}>
                      <div className="is-flex">
                        <div>Ref:</div>
                        <div className="flex-1 b-b-1 has-text-centered">
                          {o.branch_reference}
                        </div>
                      </div>
                      <div className="is-flex">
                        <div>Date:</div>
                        <div className="flex-1 b-b-1 has-text-centered">
                          {moment(days[days.length - 1]).format("MM/DD/YYYY")}
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <Row gutter={8}>
                    <Col span={12}>
                      <table className="is-full-width">
                        <tbody>
                          <tr>
                            <td style={{ width: "150px" }}>Employee Name</td>
                            <td className="b-b-1 has-text-weight-bold">
                              {o?.employee?.name}
                            </td>
                          </tr>
                          {/*                           <tr>
                            <td>SSS No.</td>
                            <td className="b-b-1">{o?.employee?.sss_no}</td>
                          </tr>
                          <tr>
                            <td>Philhealth No.</td>
                            <td className="b-b-1">
                              {o?.employee?.philhealth_no}
                            </td>
                          </tr> */}
                        </tbody>
                      </table>
                    </Col>
                    <Col span={12}>
                      <table className="is-full-width">
                        <tbody>
                          <tr>
                            <td>Company/Branch</td>
                            <td className="b-b-1 has-text-weight-bold">
                              {o?.employee?.branch?.company?.name || ""} /{" "}
                              {o?.employee?.branch?.name || ""}
                            </td>
                          </tr>
                          {/* <tr>
                            <td style={{ width: "150px" }}>HDMF No.</td>
                            <td className="b-b-1">{o?.employee?.hdmf_no}</td>
                          </tr>
                          <tr>
                            <td>TIN</td>
                            <td className="b-b-1"> {o?.employee?.tin}</td>
                          </tr> */}
                        </tbody>
                      </table>
                    </Col>
                  </Row>

                  <div>Explanation</div>
                  <div className="has-text-weight-bold has-text-centered">
                    IN PAYMENT FOR PAYROLL PERIOD:{" "}
                    {moment(days[0]).format("MMM D")} -{" "}
                    {moment(days[days.length - 1]).format("MMM D, YYYY")}
                  </div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Row>
                        <Col span={10}></Col>
                        <Col span={4} className="has-text-centered">
                          No. of Days/Hrs
                        </Col>
                        <Col span={1} className="has-text-centered"></Col>
                        <Col span={4} className="has-text-centered">
                          Rate
                        </Col>
                        <Col span={1} className="has-text-centered"></Col>
                        <Col span={4}></Col>
                      </Row>
                      <Row>
                        <Col span={10}>Basic Salary</Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.reg_days)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {o.daily_rate}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          {numberFormat(o.basic_pay)}
                        </Col>
                      </Row>

                      <Row>
                        <Col span={10}>Overtime (Regular) (25%)</Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.ot_hours)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {o.ot_rate}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          {numberFormat(o.ot_pay)}
                        </Col>
                      </Row>

                      <Row>
                        <Col span={10}>Overtime (Special) (30%)</Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.special_ot_hours)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {o.special_ot_rate}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          {numberFormat(o.special_ot_pay)}
                        </Col>
                      </Row>
                      {/* <Row>
                      <Col span={10}>Night Diff (10%)</Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.night_diff_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.night_diff_pay / o.night_diff_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.night_diff_pay)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={10}>Night Diff OT (37.5%)</Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.night_diff_ot_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(
                          o.night_diff_ot_pay / o.night_diff_ot_hours
                        )}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.night_diff_ot_pay)}
                      </Col>
                    </Row> */}
                      {/* <Row>
                      <Col span={10}>
                        Rest Day (30%)
                        {(o?.days || [])
                          .filter((o) => o.rest_day_hours > 0)
                          .map((o) => moment(o.date).format("MM/DD/YYYY"))
                          .join(", ")}
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.rest_day_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {o.rest_day_rate}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.rest_day_pay)}
                      </Col>
                    </Row> */}
                      <Row>
                        <Col span={10}>
                          Special Holiday (30%)
                          {(o?.days || [])
                            .filter((o) => o.special_holiday_hours > 0)
                            .map((o) => moment(o.date).format("MM/DD/YYYY"))
                            .join(", ")}
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.special_holiday_hours)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.special_holiday_rate)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          {numberFormat(o.special_holiday_pay)}
                        </Col>
                      </Row>
                      <Row>
                        <Col span={10}>
                          Regular Holiday (100%)
                          {(o?.days || [])
                            .filter((o) => o.regular_holiday_hours > 0)
                            .map((o) => moment(o.date).format("MM/DD/YYYY"))
                            .join(", ")}
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.regular_holiday_hours)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.regular_holiday_rate)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          {numberFormat(o.regular_holiday_pay)}
                        </Col>
                      </Row>
                      {/* <Row>
                      <Col span={10}>
                        Special Holiday/Rest Day (50%)
                        {(o?.days || [])
                          .filter((o) => <o className="special_rest_h"></o> > 0)
                          .map((o) => moment(o.date).format("MM/DD/YYYY"))
                          .join(", ")}
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.special_rest_day_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.special_rest_day_rate)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.special_rest_day_pay)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={10}>
                        Reg. Holiday/Rest Day (160%)
                        {(o?.days || [])
                          .filter((o) => o.regular_rest_day_hours > 0)
                          .map((o) => moment(o.date).format("MM/DD/YYYY"))
                          .join(", ")}
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.regular_rest_day_hours)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.regular_rest_day_rate)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.regular_rest_day_pay)}
                      </Col>
                    </Row> */}

                      {/* <Row>
                      <Col span={10}>Non-Taxable Allowance</Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.reg_days)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.daily_non_taxable_allowance)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.none_taxable_allowance)}
                      </Col>
                    </Row>
                    <Row>
                      <Col span={10}>Meal Allowance</Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.reg_days)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        x
                      </Col>
                      <Col span={4} className="has-text-centered">
                        {numberFormat(o.daily_meal_allowance)}
                      </Col>
                      <Col span={1} className="has-text-centered">
                        =
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(o.meal_allowance)}
                      </Col>
                    </Row>

                    {o.employee?.has_free_lunch && (
                      <Row>
                        <Col span={10}>Free Lunch</Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.reg_days)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          FREE
                        </Col>
                        <Col span={1} className="has-text-centered">
                          =
                        </Col>
                        <Col span={4} className="has-text-right">
                          FREE
                        </Col>
                      </Row>
                    )}

                    {o.employee?.has_free_snacks && (
                      <Row>
                        <Col span={10}>Free Snacks</Col>
                        <Col span={4} className="has-text-centered">
                          {numberFormat(o.reg_days)}
                        </Col>
                        <Col span={1} className="has-text-centered">
                          x
                        </Col>
                        <Col span={4} className="has-text-centered">
                          FREE
                        </Col>
                        <Col span={1} className="has-text-centered">
                          {" "}
                          ={" "}
                        </Col>
                        <Col span={4} className="has-text-right">
                          FREE
                        </Col>
                      </Row>
                    )} */}

                      <Row>
                        <Col span={10}>Gross Salary</Col>
                        <Col span={4} className="has-text-centered"></Col>
                        <Col span={1} className="has-text-centered"></Col>
                        <Col span={4} className="has-text-centered"></Col>
                        <Col span={1} className="has-text-centered"></Col>
                        <Col span={4} className="has-text-right b-t-2">
                          {numberFormat(o.total_gross_salary)}
                        </Col>
                      </Row>
                    </Col>
                    <Col span={6}>
                      <div className="underline has-text-weight-bold">
                        DEDUCTIONS
                      </div>

                      <div className="p-l-3">
                        <Row>
                          <Col span={16}>SSS Cont.</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(o.sss_contribution)}
                          </Col>
                        </Row>
                        <Row>
                          <Col span={16}>Pag-ibig Cont.</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(o.hdmf_contribution)}
                          </Col>
                        </Row>
                        <Row>
                          <Col span={16}>Philhealth Cont.</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(o.philhealth_contribution)}
                          </Col>
                        </Row>
                        <Row>
                          <Col span={16}>Withholding Tax</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(o.wtax)}
                          </Col>
                        </Row>
                        <Row className="b-t-2">
                          <Col span={16}>Total</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(o.total_premium_deductions)}
                          </Col>
                        </Row>
                      </div>
                    </Col>
                    <Col span={6}>
                      <Row>
                        <Col
                          span={16}
                          className="has-text-weight-bold underline"
                        >
                          OTHERS DEDUCTIONS
                        </Col>
                        <Col span={8} className="has-text-right"></Col>
                      </Row>
                      {(o.deductions || []).map((deduction_item, i) => (
                        <Row key={i}>
                          <Col span={16}>{deduction_item.deduction}</Col>
                          <Col span={8} className="has-text-right">
                            {numberFormat(deduction_item.amount)}
                          </Col>
                        </Row>
                      ))}
                      <Row className="b-t-2">
                        <Col span={16}>Total</Col>
                        <Col span={8} className="has-text-right">
                          {numberFormat(o.other_deductions)}
                        </Col>
                      </Row>
                      <Row>
                        <Col span={16}></Col>
                        <Col span={8} className="has-text-right">
                          &nbsp;
                        </Col>
                      </Row>

                      <Row>
                        <Col span={16}>NET SALARY</Col>
                        <Col
                          span={8}
                          className="has-text-weight-bold has-text-right"
                        >
                          <span className="underline">
                            ₱{numberFormat(net_salary_pay)}
                          </span>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                  <div>
                    Remarks:
                    {(o?.days || [])
                      .filter(
                        (o) =>
                          o.status && o.status !== "Present" && !o.is_rest_day
                      )
                      .map((day, i) => {
                        return `${day.status} - ${moment(day.date).format(
                          "MM/DD/YYYY"
                        )}`;
                      })
                      .join("; ")}{" "}
                    {days_leave.length > 0 &&
                      `; Leaves Availed : ${days_leave.join(", ")}`}
                    {/* ; {o.remarks} */}
                  </div>
                  <hr className="b-t-1" />
                  <Row>
                    <Col span={11}>
                      <div className="is-flex">
                        <div>Prepared by: </div>
                        <div className="flex-1 b-b-1">&nbsp;</div>
                      </div>
                      <div className="is-flex m-t-3">
                        <div>Approved by: </div>
                        <div className="flex-1 b-b-1">&nbsp;</div>
                      </div>
                    </Col>
                    <Col span={2}></Col>
                    <Col span={11}>
                      <div className="is-flex">
                        <div>Received From: </div>
                        <div className="flex-1 b-b-1 has-text-weight-bold has-text-centered">
                          {o?.employee?.branch?.company?.name}-
                          {o?.employee?.branch?.name}
                        </div>
                      </div>
                      <div className="is-flex">
                        <div>the sum of pesos: </div>
                        <div className="flex-1 "></div>
                      </div>
                      <div className="is-flex">
                        <div className="flex-1 b-b-1 has-text-centered">
                          **
                          {converter
                            .toWords(net_salary_pay || 0)
                            .toUpperCase()}{" "}
                          AND {cents}
                          /100 PESOS ONLY **
                        </div>
                      </div>
                      <div className="is-flex m-t-3">
                        <div className="flex-1 b-b-1">&nbsp;</div>
                      </div>

                      <div className=" has-text-centered">
                        {o?.employee?.name}
                      </div>
                    </Col>
                  </Row>
                </div>
              )
            );
          })}
        </div>
      </div>
    </Content>
  );
}
