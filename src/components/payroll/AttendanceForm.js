import React, { useState, useEffect, useRef } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";
import classnames from "classnames";

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
  Checkbox,
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

const { Content } = Layout;

const url = "/api/payroll/";
const title = "Attendance Form";

const initialValues = {
  period_covered: [
    moment().startOf("week").days(1),
    moment().startOf("week").days(1).add({ days: 5 }).endOf("day"),
  ],
  type: PAYROLL_REGULAR,
};

const onMarkAll = ({ status, setRecords }) => {
  setRecords((prevRecords) => {
    return prevRecords.map((record) => {
      return {
        ...record,
        days: record.days.map((day) => {
          let hours = null;
          let is_rest_day = false;

          if (status === "Present") {
            hours = 8;
          } else if (status === null) {
            hours = null;
          }
          return {
            ...day,
            status,
            hours,
            is_rest_day,
          };
        }),
      };
    });
  });
};

const onHolidayChange = ({
  key,
  value,
  date,
  setHolidayDays,
  holiday_days,
  day_index,
}) => {
  const form_data = {
    date,
    key,
    value,
  };

  axios
    .put("/api/payroll/day", form_data)
    .then((response) => {
      let days = [...holiday_days];
      days[day_index][key] = value;

      setHolidayDays(days);
    })
    .catch((err) => message.error("There was an error updating your day"));
};

const onUpdateAttendance = ({
  row_index,
  day_index,
  status,
  records,
  setRecords,
}) => {
  const attendance_status = [
    null,
    "Present",
    "Absent",
    // "Late",
    // "Penalty",
    // "No Time-in",
    "Undertime",
    /* "Switch", */
  ];
  const attendance_index = attendance_status.indexOf(status);
  let new_status_index = attendance_index + 1;
  if (new_status_index >= attendance_status.length) new_status_index = 0;

  const new_status = attendance_status[new_status_index];

  let list = [...records];
  list[row_index].days[day_index].status = new_status;

  if (new_status === "Absent") {
    list[row_index].days[day_index].hours = 0;
  }

  setRecords(list);
};

const onUpdateRestDay = ({
  row_index,
  day_index,
  is_rest_day,
  records,
  setRecords,
}) => {
  const new_status_is_rest_day = !is_rest_day;

  let list = [...records];

  list[row_index].days[day_index].is_rest_day = new_status_is_rest_day;

  if (new_status_is_rest_day) {
    list[row_index].days[day_index].hours = 0;
    list[row_index].days[day_index].status = null;
  }

  setRecords(list);
};

const onUpdateHours = ({
  row_index,
  day_index,
  hours,
  setRecords,
  key = "hours",
}) => {
  setRecords((records) => {
    let list = [...records];
    list[row_index].days[day_index][key] = hours;
    return list;
  });
};

const onUpdateLeave = ({
  row_index,
  day_index,
  setRecords,
  key = "leave_availed",
  leave_availed,
}) => {
  setRecords((records) => {
    let list = [...records];
    list[row_index].days[day_index][key] = leave_availed;
    return list;
  });
};

const onSavePayroll = ({ records }) => {
  axios
    .put("/api/payroll/attendance-records", records)
    .then((response) => {
      message.success("Attendance Saved");
    })
    .catch((err) => message.error("There as an error saving payroll records"));
};

export default function AttendanceForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [days, setDays] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);
  const [holiday_days, setHolidayDays] = useState([]);

  const [options, setOptions] = useState({});

  const report = useRef(null);

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });

    const source = axios.CancelToken.source();
    if (state.period_covered && state.branch?._id) {
      const form_data = {
        period_covered: state.period_covered,
        branch: state.branch,
      };
      const loading = message.loading("Loading...");
      axios
        .post(`${url}attendance`, form_data, {
          cancelToken: source.token,
        })
        .then((response) => {
          loading();
          if (response.data.payroll) {
            setRecords(response.data.payroll);
            setDays(response.data.days);
            setHolidayDays(response.data.holiday_days);
          }
        })
        .catch((err) => {
          loading();
          if (!axios.isCancel(err)) {
            message.error("There was an error processing your request");
          }
        });
    }
    return () => {
      source.cancel();
    };
  }, [state.period_covered, state.branch]);

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
                  period_covered:
                    dates[0] && dates[1]
                      ? [dates[0], dates[0].clone().add(5, "days").endOf("day")]
                      : undefined,
                }))
              }
              disabledDate={(current) => {
                return current && current.days() !== 1;
              }}
              disabled={[false, true]}
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
              <Space>
                <Button
                  type="primary"
                  onClick={() => onSavePayroll({ records })}
                  icon={<SaveOutlined />}
                >
                  Save
                </Button>
                {/* <Button
                  type="primary"
                  onClick={() => {
                    const form_data = {
                      records,
                      days,
                      holiday_days,
                    };

                    axios
                      .post("/api/payroll/download-attendance", form_data)
                      .then((response) => {
                        if (response.data) {
                          window.open(
                            `/public/reports/${response.data.filename}`
                          );
                        }
                      })
                      .catch((err) => {
                        console.log(err);
                        setErrors(err?.response?.data);
                        message.error(
                          "There was a problem processing your transaction"
                        );
                      });
                  }}
                >
                  Download
                </Button> */}
              </Space>
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

          <div>
            Legends : <br />
            <div>
              <i className="fas fa-user-check m-r-1"></i> Present ;{" "}
              <i className="fas fa-user-times m-r-1"></i> Absent ;{" "}
              {/* <i className="fas fa-user-clock m-r-1"></i> Late ;{" "}
              <i className="fas fa-business-time m-r-1"></i>No Time-in ;{" "}
              <i className="fas fa-frown m-r-1"></i>Penalty ;{" "} */}
              <i className="fas fa-clock m-r-1"></i>Undertime ;{" "}
              {/* <i className="fas fa-random m-r-1"></i>Switch ;{" "} */}
              {/* <i className="fas fa-bed m-r-1"></i>Rest Day ;{" "}
              <i className="fas fa-child m-r-1"></i> Not Rest Day */}
            </div>
          </div>
          {/* <div className="has-text-weight-bold">
            ** Note: Hours specified is night differential inclusive
          </div> */}

          <div>
            <Space>
              <Button
                type="primary"
                icon={<i className="fas fa-user-check"></i>}
                onClick={() => {
                  onMarkAll({
                    status: "Present",
                    setRecords,
                  });
                }}
              >
                <span style={{ paddingLeft: "8px" }}>Mark all as Present</span>
              </Button>

              <Button
                onClick={() => {
                  onMarkAll({
                    status: null,
                    setRecords,
                  });
                }}
                icon={<i className="fas fa-undo"></i>}
              >
                <span style={{ paddingLeft: "8px" }}>Unmark all</span>
              </Button>
            </Space>
          </div>
          <div className="overflow-auto">
            <Table
              className="attendance-table m-t-1"
              size="small"
              dataSource={addKeysToArray(records)}
              pagination={false}
              bordered={true}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            >
              <Column
                key="employee"
                title="Employee"
                dataIndex={["employee"]}
                render={(employee) => (
                  <div>
                    {employee?.name}{" "}
                    {employee.has_incentives && `(Has Incentives)`}
                  </div>
                )}
              />
              {days.map((day, day_index) => (
                <Column
                  key={`regular-${day_index}`}
                  align="center"
                  width={150}
                  dataIndex="days"
                  title={
                    <div>
                      {moment(day).format("MM/DD/YYYY, ddd")}
                      <div>
                        <Checkbox
                          checked={holiday_days?.[day_index]?.has_no_operations}
                          onChange={(e) => {
                            onHolidayChange({
                              key: "has_no_operations",
                              value: e.target.checked,
                              date: moment(day).toDate(),
                              setHolidayDays,
                              holiday_days,
                              day_index,
                            });
                          }}
                        >
                          No Operations
                        </Checkbox>
                      </div>
                      <div>
                        <Checkbox
                          checked={
                            holiday_days?.[day_index]?.is_special_holiday
                          }
                          onChange={(e) => {
                            onHolidayChange({
                              key: "is_special_holiday",
                              value: e.target.checked,
                              date: moment(day).toDate(),
                              setHolidayDays,
                              holiday_days,
                              day_index,
                            });
                          }}
                        >
                          Special Holiday
                        </Checkbox>
                      </div>
                      <div>
                        <Checkbox
                          checked={
                            holiday_days?.[day_index]?.is_regular_holiday
                          }
                          onChange={(e) => {
                            onHolidayChange({
                              key: "is_regular_holiday",
                              value: e.target.checked,
                              date: moment(day).toDate(),
                              setHolidayDays,
                              holiday_days,
                              day_index,
                            });
                          }}
                        >
                          Regular Holiday
                        </Checkbox>
                      </div>
                    </div>
                  }
                  render={(days, record, row_index) => (
                    <div className="is-flex flex-direction-row align-items-center">
                      <i
                        onClick={() => {
                          onUpdateAttendance({
                            row_index,
                            day_index,
                            status: days?.[day_index]?.status,
                            records,
                            setRecords,
                          });
                        }}
                        className={classnames("fas", {
                          "fa-user-check":
                            days?.[day_index]?.status === "Present",
                          "fa-user-times":
                            days?.[day_index]?.status === "Absent",
                          "fa-user-clock": days?.[day_index]?.status === "Late",
                          "fa-business-time":
                            days?.[day_index]?.status === "No Time-in",
                          "fa-frown": days?.[day_index]?.status === "Penalty",
                          "fa-random": days?.[day_index]?.status === "Switch",
                          "fa-clock": days?.[day_index]?.status === "Undertime",
                          "fa-question-circle":
                            days?.[day_index]?.status === null,
                        })}
                      ></i>

                      <Space>
                        <Input
                          id="hours"
                          placeholder="HRS"
                          value={days?.[day_index]?.hours}
                          onChange={(e) => {
                            e.preventDefault();
                            onUpdateHours({
                              row_index,
                              day_index,
                              hours: e.target.value,
                              records,
                              setRecords,
                            });
                          }}
                        />
                        <Checkbox
                          checked={days?.[day_index]?.leave_availed || false}
                          onChange={(e) => {
                            e.preventDefault();
                            const target = e.target;
                            onUpdateLeave({
                              row_index,
                              day_index,
                              leave_availed: target.checked,
                              setRecords,
                            });
                          }}
                        >
                          LEAVE?
                        </Checkbox>
                      </Space>
                    </div>
                  )}
                />
              ))}
            </Table>
          </div>
        </div>
      </div>
    </Content>
  );
}
