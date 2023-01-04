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
  SaveOutlined,
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
import { addKeysToArray, onBranchSearch } from "../../utils/utilities";
import round from "../../utils/round";
import { sumBy } from "lodash";
import ReactToPrint from "react-to-print";
import Column from "antd/lib/table/Column";
import ColumnGroup from "antd/lib/table/ColumnGroup";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { payroll_days_options } from "../../utils/Options";
import { authenticateAdmin } from "../../utils/authentications";
import {
  PAYROLL_REGULAR,
  PAYROLL_OVERTIME,
  PAYROLL_SPECIAL,
  PAYROLL_SUMMARY,
  PAYROLL_DEDUCTIONS,
  PAYROLL_FINANCIAL_ASSISTANCE,
  PAYROLL_SPECIAL_HOLIDAY,
  PAYROLL_REGULAR_HOLIDAY,
} from "../../utils/constants";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import { computeNetSalary } from "../../utils/computations";

const { Content } = Layout;

const url = "/api/payroll/";
const title = "Payroll Form";

const initialValues = {
  date: moment().startOf("week").days(1),
  period_covered: [
    moment().startOf("week").days(1),
    moment().startOf("week").days(1).add({ days: 5 }).endOf("day"),
  ],
  type: PAYROLL_REGULAR,
};

const onSavePayroll = ({ records, state, setRecords, setDays }) => {
  if (state.period_covered && state.branch) {
    axios
      .put("/api/payroll/payroll-records", records)
      .then((response) => {
        message.success("Payroll Saved");
      })
      .catch((err) =>
        message.error("There as an error saving payroll records")
      );
  }
};

const onUpdateRecord = ({
  setRecords,
  reg_days,
  ot_hours,
  special_ot_hours,
  rest_day_hours,
  special_holiday_hours,
  regular_holiday_hours,
  records,
  record,
  row_index,
}) => {
  let payroll_records = [...records];

  //computation here
  const basic_pay = round(record.daily_rate * round(reg_days));
  const ot_pay = round(record.ot_rate * round(ot_hours));
  const special_ot_pay = round(
    record.special_ot_rate * round(special_ot_hours)
  );

  const total_ot_amount = round(ot_pay + special_ot_pay);

  const rest_day_pay = round(record.rest_day_rate * round(rest_day_hours));
  const special_holiday_pay = round(
    record.special_holiday_rate * round(special_holiday_hours)
  );
  const regular_holiday_pay = round(
    record.regular_holiday_rate * round(regular_holiday_hours)
  );

  const total_premium_amount = round(
    rest_day_pay + special_holiday_pay + regular_holiday_pay
  );

  const none_taxable_allowance = round(
    record.daily_non_taxable_allowance * reg_days
  );

  const total_gross_salary = round(
    basic_pay + total_ot_amount + total_premium_amount + none_taxable_allowance
  );
  const net_salary_pay = round(
    total_gross_salary -
      record.total_deduction +
      round(record.total_adjustment_amount)
  );

  const form_data = {
    reg_days,
    ot_hours,
    special_ot_hours,
    rest_day_hours,
    special_holiday_hours,
    regular_holiday_hours,

    basic_pay,
    ot_pay,
    special_ot_pay,
    total_ot_amount,
    rest_day_pay,
    special_holiday_pay,
    regular_holiday_pay,
    none_taxable_allowance,

    total_gross_salary,
    total_premium_amount,
    net_salary_pay,
  };

  payroll_records[row_index] = {
    ...payroll_records[row_index],
    ...form_data,
  };

  /* axios
    .put("/api/payroll", form_data)
    .then((response) => {})
    .catch((err) => console.log(err)); */

  setRecords(payroll_records);
};

const onUpdateOvertime = ({
  setRecords,
  ot_previous_hours = 0,
  records,
  record,
  row_index,
  gross_financial_assistance = 0,
  late_amount_financial_assistance = 0,
}) => {
  let payroll_records = [...records];

  const employee_record = { ...record };

  let total_ot_hours = round(
    round(sumBy(employee_record.ot, (o) => round(o.hours || 0))) +
      round(ot_previous_hours)
  );

  let ot_amount = round(total_ot_hours * record.ot_rate);

  let total_ot_amount = round(
    ot_amount + (employee_record.special_amount || 0)
  );

  const total_gross_salary = round(
    (employee_record.reg_amount || 0) +
      total_ot_amount -
      (record.late_amount || 0)
  );

  //OT financial assistance
  const ot_hours_financial_assistance = record.employee
    .has_ot_financial_assistance
    ? total_ot_hours
    : 0;

  const ot_amount_financial_assistance = round(
    (ot_hours_financial_assistance * record.daily_financial_assistance) / 8
  );

  const net_financial_assistance = round(
    round(gross_financial_assistance) +
      round(ot_amount_financial_assistance) -
      round(late_amount_financial_assistance)
  );

  const net_salary_pay = round(
    total_gross_salary - (record.total_deduction || 0)
  );

  const form_data = {
    ...employee_record,
    ot_previous_hours,
    total_ot_hours,
    ot_amount,
    total_ot_amount,
    total_gross_salary,
    ot_hours_financial_assistance,
    ot_amount_financial_assistance,
    net_financial_assistance,
    net_salary_pay,
  };
  payroll_records[row_index] = {
    ...payroll_records[row_index],
    ...form_data,
  };

  axios
    .put("/api/payroll", form_data)
    .then((response) => {})
    .catch((err) => console.log(err));
  setRecords(payroll_records);
};

const onUpdateSpecial = ({
  setRecords,
  index,
  value,
  records,
  record,
  row_index,
}) => {
  let payroll_records = [...records];

  const employee_record = { ...record };
  employee_record.special[index].hours = round(value);

  let total_special_hours = sumBy(employee_record.special, (o) =>
    round(o.hours || 0)
  );

  let special_amount = round(total_special_hours * record.special_rate);

  let total_ot_amount = round(
    special_amount + (employee_record.ot_amount || 0)
  );

  const total_gross_salary = round(
    (employee_record.reg_amount || 0) +
      total_ot_amount -
      (record.late_amount || 0)
  );

  const net_salary_pay = round(
    total_gross_salary - (record.total_deduction || 0)
  );

  const form_data = {
    ...employee_record,
    total_special_hours,
    special_amount,
    total_ot_amount,
    total_gross_salary,
    net_salary_pay,
  };
  payroll_records[row_index] = {
    ...payroll_records[row_index],
    ...form_data,
  };

  axios
    .put("/api/payroll", form_data)
    .then((response) => {})
    .catch((err) => console.log(err));
  setRecords(payroll_records);
};

const onUpdateDeductions = ({
  period_covered,
  employee,
  ca_previous = 0,
  ca_additional = 0,
  ca_payment = 0,
  sss_contribution = 0,
  sss_previous = 0,
  sss_payment = 0,
  hdmf_contribution = 0,
  hdmf_previous = 0,
  hdmf_payment = 0,
  philhealth_contribution = 0,
  total_gross_salary = 0,
  setRecords,
  row_index,
  records,
}) => {
  let payroll_records = [...records];

  const total_ca = round(parseFloat(ca_previous) + parseFloat(ca_additional));
  const ca_balance = round(total_ca - ca_payment);
  const sss_balance = round(sss_previous - sss_payment);
  const hdmf_balance = round(hdmf_previous - hdmf_payment);

  console.log(
    ca_payment,
    sss_payment,
    hdmf_payment,
    sss_contribution,
    hdmf_contribution,
    philhealth_contribution
  );
  const total_deduction = round(
    parseFloat(ca_payment || 0) +
      parseFloat(sss_payment || 0) +
      parseFloat(hdmf_payment || 0) +
      parseFloat(sss_contribution || 0) +
      parseFloat(hdmf_contribution || 0) +
      parseFloat(philhealth_contribution || 0)
  );

  const net_salary_pay = round(total_gross_salary - total_deduction);

  const form_data = {
    ...payroll_records[row_index],
    ca_previous,
    ca_additional,
    ca_payment,
    total_ca,
    ca_balance,
    sss_contribution,
    sss_previous,
    sss_payment,
    sss_balance,
    hdmf_contribution,
    hdmf_previous,
    hdmf_payment,
    hdmf_balance,
    philhealth_contribution,
    total_deduction,
    net_salary_pay,
    employee,
    period_covered,
  };

  payroll_records[row_index] = {
    ...form_data,
  };

  setRecords(payroll_records);
  axios
    .put("/api/payroll", form_data)
    .then((response) => {})
    .catch((err) => console.log(err));
};

const onUpdateLateHours = ({
  setRecords,
  value,
  records,
  record,
  row_index,
  late_rate,
  gross_financial_assistance = 0,
  ot_amount_financial_assistance = 0,
}) => {
  let payroll_records = [...records];

  const employee_record = { ...record };
  const total_late_hours = value;
  employee_record.total_late_hours = total_late_hours;

  let late_amount = round(total_late_hours * late_rate);

  let reg_gross_salary = round((employee_record.reg_amount || 0) - late_amount);

  const late_hours_financial_assistance =
    record.daily_financial_assistance > 0 ? total_late_hours : 0;

  const late_amount_financial_assistance = round(
    (record.daily_financial_assistance / 8) * late_hours_financial_assistance
  );

  const net_financial_assistance = round(
    round(gross_financial_assistance) +
      round(ot_amount_financial_assistance) -
      round(late_amount_financial_assistance)
  );

  const total_gross_salary = round(
    (record.reg_amount || 0) +
      (employee_record.total_ot_amount || 0) -
      late_amount
  );

  const net_salary_pay = round(
    total_gross_salary - (record.total_deduction || 0)
  );

  const form_data = {
    ...employee_record,
    total_late_hours,
    late_amount,
    reg_gross_salary,
    late_rate,
    late_hours_financial_assistance,
    late_amount_financial_assistance,
    net_financial_assistance,
    total_gross_salary,
    net_salary_pay,
  };

  payroll_records[row_index] = {
    ...payroll_records[row_index],
    ...form_data,
  };

  axios
    .put("/api/payroll", form_data)
    .then((response) => {})
    .catch((err) => console.log(err));

  setRecords(payroll_records);
};

export default function PayrollForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [days, setDays] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({});
  const [deductions, setDeductions] = useState([]);

  const report = useRef(null);

  useEffect(() => {
    axios.get("/api/deductions").then((response) => {
      if (response.data) {
        setDeductions(response.data);
      }
    });

    return () => {};
  }, []);

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });

    const source = axios.CancelToken.source();

    if (state.period_covered && state.branch?._id) {
      const loading = message.loading("Loading...", 0);

      const form_data = {
        period_covered: state.period_covered,
        branch: state.branch,
      };

      axios
        .post(`${url}period`, form_data, {
          cancelToken: source.token,
        })
        .then((response) => {
          if (response.data.payroll) {
            setRecords(response.data.payroll);
            setDays(response.data.days);
          }
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            message.error("There was an error processing your request");
          }
        })
        .finally(() => {
          loading();
        });
    }
    return () => {
      source.cancel();
    };
  }, [state.period_covered, state.type, state.branch]);

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
          <Col span={12}>
            <SelectFieldGroup
              label="Branch"
              value={
                state.branch &&
                `${state.branch?.company?.name}-${state.branch?.name}`
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
              {state.period_covered &&
                state?.period_covered[0] &&
                state?.period_covered[1] && (
                  <Button
                    type="primary"
                    onClick={() =>
                      onSavePayroll({ records, state, setRecords, setDays })
                    }
                    icon={<SaveOutlined />}
                  >
                    Save
                  </Button>
                )}
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

          {state.period_covered &&
            state?.period_covered[0] &&
            state?.period_covered[1] && (
              <div className="tbl-container">
                <div className="tableFixHead">
                  <table className="payroll-table">
                    <thead>
                      <tr>
                        <th width={20}>#</th>
                        <th width={200} className="has-text-weight-bold">
                          EMPLOYEE
                        </th>

                        <th width={100} className="has-text-centered">
                          RATE
                        </th>

                        <th width={100} className="has-text-centered">
                          REG.DAYS
                        </th>
                        <th width={100} className="has-text-centered">
                          BASIC PAY
                        </th>
                        <th width={100} className="has-text-centered">
                          OT HRS
                        </th>

                        <th width={100} className="has-text-centered">
                          SP.OT.HRS
                        </th>
                        <th width={100} className="has-text-centered">
                          OT PAY
                        </th>
                        <th width={100} className="has-text-centered">
                          SP. HOL. HRS
                        </th>
                        <th width={100} className="has-text-centered">
                          REG HOL. HRS
                        </th>

                        <th width={100} className="has-text-centered">
                          PREM.PAY
                        </th>
                        <th width={100} className="has-text-centered">
                          GROSS
                        </th>

                        <th width={100} className="has-text-centered">
                          SSS
                        </th>
                        <th width={100} className="has-text-centered">
                          HDMF
                        </th>
                        <th width={100} className="has-text-centered">
                          PHILHEALTH
                        </th>
                        <th width={100} className="has-text-centered">
                          WTAX
                        </th>
                        <th width={100} className="has-text-centered">
                          PREM.DED.
                        </th>
                        {deductions.map((deduction, index) => {
                          return (
                            <th
                              width={100}
                              key={index}
                              className="has-text-centered"
                            >
                              {deduction?.name.toUpperCase()}
                            </th>
                          );
                        })}
                        <th width={100} className="has-text-centered">
                          OTHER DED.
                        </th>
                        <th width={100} className="has-text-centered">
                          TOTAL DED.
                        </th>
                        <th width={100} className="has-text-right">
                          NET PAY
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, i) => {
                        const record_index = i;
                        return (
                          <tr key={i}>
                            <td className="has-text-centered">{i + 1}</td>
                            <td key={i} width={150}>
                              {record?.employee?.name}
                            </td>

                            <td className="has-text-centered">
                              {numberFormat(record.daily_rate)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.reg_days)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.basic_pay)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.ot_hours)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.special_ot_hours)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.total_ot_amount)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.special_holiday_hours)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.regular_holiday_hours)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.total_premium_amount)}
                            </td>

                            <td className="has-text-centered">
                              {numberFormat(record.total_gross_salary)}
                            </td>

                            <td className="has-text-centered">
                              {numberFormat(record.sss_contribution)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.hdmf_contribution)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.philhealth_contribution)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.wtax)}
                            </td>

                            <td className="has-text-centered">
                              {numberFormat(record.total_premium_deductions)}
                            </td>
                            {deductions.map((deduction, index) => {
                              const value = (record.deductions || [])?.filter(
                                (o) => {
                                  return o.deduction === deduction.name;
                                }
                              )?.[0]?.amount;
                              return record.is_expense ? (
                                <td />
                              ) : (
                                <td key={index} className="has-text-centered">
                                  <Input
                                    type="number"
                                    step={0.01}
                                    value={value}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const deduction_object =
                                        record.deductions.find(
                                          (o) => o.deduction === deduction.name
                                        );
                                      if (deduction_object) {
                                        deduction_object.amount = value;
                                        const _records = [...records];

                                        const { ...summary } = computeNetSalary(
                                          {
                                            ...record,
                                            deductions: record.deductions,
                                          }
                                        );

                                        _records[record_index] = {
                                          ..._records[record_index],
                                          deductions: record.deductions,
                                          ...summary,
                                        };
                                        setRecords(_records);
                                      } else {
                                        let deductions = [...record.deductions];
                                        deductions = [
                                          ...deductions,
                                          {
                                            deduction: deduction.name,
                                            amount: value,
                                          },
                                        ];

                                        const { ...summary } = computeNetSalary(
                                          {
                                            ...record,
                                            deductions,
                                          }
                                        );

                                        const _records = [...records];
                                        _records[record_index] = {
                                          ..._records[record_index],
                                          deductions,
                                          ...summary,
                                        };

                                        setRecords(_records);
                                      }
                                    }}
                                  />
                                </td>
                              );
                            })}
                            <td className="has-text-centered">
                              {numberFormat(record.other_deductions)}
                            </td>
                            <td className="has-text-centered">
                              {numberFormat(record.total_deductions)}
                            </td>
                            <td className="has-text-right">
                              {numberFormat(record.net_salary_pay)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </Content>
  );
}
