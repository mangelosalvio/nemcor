const express = require("express");
const router = express.Router();
const Payroll = require("./../../models/Payroll");
const DailyTimeRecord = require("./../../models/DailyTimeRecord");
const isEmpty = require("./../../validators/isEmpty");
const filterId = require("./../../utils/filterId");
const validateInput = require("./../../validators/payroll");
const moment = require("moment-timezone");
const Employee = require("../../models/Employee");
const async = require("async");
const {
  getDaysInArray,
  updateCheckVoucherRefefence,
  updateCheckVoucherFinancialAssistanceRefefence,
  upsertEmployeeDTR,
  previousDayHours,
  getPayrollAdjustmentsOfEmployee,
  getPayrollIncentive,
  getEmployeeAttendance,
  getDayStatus,
  getPayrollSummary,
  getNumberOfPersonsWithIncentives,
  computeIncentive,
  getIncentivesSummaryReport,
  getPayrollDeductions,
} = require("../../library/payroll_functions");
const round = require("../../utils/round");
const mongoose = require("mongoose");
const Day = require("../../models/Day");
const { sumBy } = require("lodash");
const Attendance = require("../../models/Attendance");
const { generateAttendanceExcel } = require("../../library/excel_functions");

const Model = Payroll;
const ObjectId = mongoose.Types.ObjectId;

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        name: {
          $regex: new RegExp(req.query.s, "i"),
        },
      };

  Model.find(form_data)
    .sort({ name: 1 })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.put("/day", (req, res) => {
  const { date, key, value } = req.body;

  Day.findOneAndUpdate(
    {
      date: moment(date).startOf("day").toDate(),
    },
    {
      $set: {
        [key]: value,
      },
    },
    {
      new: 1,
      upsert: true,
    }
  ).then((record) => {
    return res.json(record);
  });
});

router.put("/dtr", (req, res) => {
  const { date, employee } = req.body;

  DailyTimeRecord.updateOne(
    {
      date,
      "employee._id": ObjectId(employee._id),
    },
    {
      $set: {
        ...req.body,
      },
    },
    {
      upsert: true,
    }
  ).exec();

  return res.json({ sucess: 1 });
});

router.put("/dtr-default-time", async (req, res) => {
  const { employee_records, date } = req.body;

  await async.each(employee_records, async (employee_record, cb) => {
    await DailyTimeRecord.updateOne(
      {
        date: date,
        "employee._id": ObjectId(employee_record.employee._id),
      },
      {
        $set: {
          ...employee_record,
        },
      },
      {
        upsert: true,
      }
    ).exec();

    cb(null);
  });

  return res.json({ sucess: 1 });
});

router.put("/payroll-records", (req, res) => {
  const records = req.body;

  async.each(
    records,
    (item, cb) => {
      Model.updateOne(
        {
          period_covered: item.period_covered,
          "employee._id": ObjectId(item.employee._id),
        },
        {
          $set: {
            ...item,
          },
        },
        {
          upsert: true,
        }
      ).exec(cb);
    },
    (err) => {
      if (err) {
        return res.status(401).json(err);
      }
      return res.json({ success: 1 });
    }
  );
});

router.put("/attendance-records", (req, res) => {
  const records = req.body;

  async.each(
    records,
    (item, cb) => {
      Attendance.updateOne(
        {
          period_covered: item.period_covered,
          "employee._id": ObjectId(item.employee._id),
        },
        {
          $set: {
            ...item,
          },
        },
        {
          upsert: true,
        }
      ).exec(cb);
    },
    (err) => {
      if (err) {
        return res.status(401).json(err);
      }
      return res.json({ success: 1 });
    }
  );
});

router.put("/", (req, res) => {
  const { period_covered, employee } = req.body;

  Model.updateOne(
    {
      period_covered,
      "employee._id": ObjectId(employee._id),
    },
    {
      $set: {
        ...req.body,
      },
    },
    {
      upsert: true,
    }
  ).exec();

  return res.json({ sucess: 1 });
});

router.post("/incentive-summary-report", async (req, res) => {
  const { total_cups, total_incentives } = await getIncentivesSummaryReport({
    period_covered: req.body.period_covered,
  });

  return res.json({
    total_cups,
    total_incentives,
  });
});

router.post("/get-pax", async (req, res) => {
  const { items } = req.body;

  const _items = await async.mapSeries(items, async (item) => {
    const date = item.date;
    const no_of_pax = await getNumberOfPersonsWithIncentives({ date });

    const { equivalent_incentives, incentive_amount } = await computeIncentive({
      no_of_cups: item.no_of_cups,
      no_of_pax,
    });

    return {
      ...item,
      no_of_pax,
      equivalent_incentives: item.has_switch ? 0 : equivalent_incentives,
      incentive_amount: item.has_switch ? 0 : incentive_amount,
      equivalent_amount: item.has_switch ? 0 : incentive_amount,
    };
  });

  return res.json(_items);
});

router.post("/paginate", (req, res) => {
  let page = req.body.page || 1;

  const form_data = {
    ...(!isEmpty(req.body.s) && {
      name: {
        $regex: new RegExp(req.body.s, "i"),
      },
    }),
  };

  Model.paginate(form_data, {
    sort: {
      name: 1,
    },
    page,
    limit: 50,
  })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => console.log(err));
});

router.post("/day", (req, res) => {
  const date = moment(req.body.date).startOf("day");

  Day.findOne({
    date: date.clone().toDate(),
  }).then((date) => {
    const {
      is_sunday = 0,
      is_special_holiday = 0,
      is_regular_holiday = 0,
    } = date || {};

    return res.json({
      is_sunday,
      is_special_holiday,
      is_regular_holiday,
    });
  });
});

router.post("/dtr", (req, res) => {
  const date = moment(req.body.date).startOf("day");

  async.parallel(
    {
      dtr: (cb) => {
        DailyTimeRecord.find({
          date: date.clone().toDate(),
        })
          .sort({
            "employee.name": 1,
          })
          .exec(cb);
      },
      employees: (cb) => {
        Employee.find({}).sort({ name: 1 }).exec(cb);
      },
    },
    (err, results) => {
      if (err) {
        return res.status(401).json(err);
      }

      let dtr = results.employees.map((employee) => {
        const employee_dtr = results.dtr.find(
          (o) => o.employee._id.toString() === employee._id.toString()
        );

        if (employee_dtr) {
          //payroll found

          return {
            ...employee_dtr.toObject(),
            employee: {
              ...employee.toObject(),
            },
          };
        }

        return {
          employee: employee.toObject(),
          date,
          shift_in: null,
          lunch_out: null,
          lunch_in: null,
          shift_out: null,
          ot_in: null,
          ot_out: null,
          am_hours: 0,
          pm_hours: 0,
          total_shift_hours: 0,
          ot_hours: 0,
        };
      });

      return res.json({ dtr });
    }
  );
});

router.post("/download-attendance", async (req, res) => {
  const { records, days, holidays } = req.body;

  const filename = await generateAttendanceExcel({
    records,
    days,
    holidays,
  });

  return res.json({ filename });
});

router.post("/attendance", (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];
  const branch = req.body.branch;

  async.parallel(
    {
      payroll: (cb) => {
        Attendance.find({
          "employee.branch._id": ObjectId(branch._id),
          period_covered: [
            period_covered[0].clone().toDate(),
            period_covered[1].clone().toDate(),
          ],
        })
          .sort({
            "employee.name": 1,
          })
          .exec(cb);
      },
      employees: (cb) => {
        Employee.find({
          "branch._id": ObjectId(branch._id),
          deleted: { $exists: false },
        })
          .sort({ name: 1 })
          .exec(cb);
      },
    },
    async (err, results) => {
      if (err) {
        return res.status(401).json(err);
      }

      const days = getDaysInArray({ period_covered });

      let payroll = await Promise.all(
        results.employees.map(async (employee) => {
          const employee_payroll = results.payroll.find(
            (o) => o.employee._id.toString() === employee._id.toString()
          );

          let payroll_days = days.map((date) => {
            return {
              date,
              status: null,
              is_rest_day: false,
            };
          });

          if (employee_payroll) {
            ({ days: payroll_days } = employee_payroll);
          }

          return {
            employee,
            period_covered,
            days: payroll_days,
          };
        })
      );

      let holiday_days = await async.map(days, async (date) => {
        let is_regular_holiday = false;
        let is_special_holiday = false;
        let has_no_operations = false;

        const day = await Day.findOne({
          date: date.toDate(),
        });

        if (day) {
          is_regular_holiday = day.is_regular_holiday;
          is_special_holiday = day.is_special_holiday;
          has_no_operations = day.has_no_operations;
        }

        return {
          date,
          is_regular_holiday,
          is_special_holiday,
          has_no_operations,
        };
      });

      return res.json({ payroll, days, holiday_days });
    }
  );
});

router.post("/period", (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];
  const branch = req.body.branch;

  const last_payroll_period = [
    period_covered[0].clone().subtract({
      week: 1,
    }),
    period_covered[1].clone().subtract({
      week: 1,
    }),
  ];

  async.parallel(
    {
      payroll: (cb) => {
        Payroll.find({
          "employee.branch._id": ObjectId(branch._id),
          period_covered: [
            period_covered[0].clone().toDate(),
            period_covered[1].clone().toDate(),
          ],
        })
          .sort({
            "employee.name": 1,
          })
          .exec(cb);
      },

      attendances: (cb) => {
        Attendance.aggregate([
          {
            $match: {
              "employee.branch._id": ObjectId(branch._id),
              period_covered: [
                period_covered[0].clone().toDate(),
                period_covered[1].clone().toDate(),
              ],
            },
          },
        ]).exec(cb);
      },

      employees: (cb) => {
        Employee.find({
          "branch._id": ObjectId(branch._id),
          deleted: { $exists: false },
        })
          .sort({ name: 1 })
          .exec(cb);
      },
    },
    async (err, results) => {
      if (err) {
        return res.status(401).json(err);
      }

      const days = getDaysInArray({ period_covered });

      let payroll = await async.mapLimit(
        results.employees,
        10,
        async (employee) => {
          /**
           * find instance of employee at payroll
           */
          const employee_payroll = results.payroll.find(
            (o) => o.employee._id.toString() === employee._id.toString()
          );

          let daily_rate = employee.daily_rate || 0;
          let hourly_rate = daily_rate / 8;
          let ot_rate = hourly_rate * 1.25;
          //let ot_rate = hourly_rate;
          let special_ot_rate = hourly_rate * 1.3;
          let rest_day_rate = hourly_rate * 0.3;
          let special_holiday_rate = hourly_rate * 0.3;
          let regular_holiday_rate = hourly_rate;
          let special_rest_day_rate = hourly_rate * 0.5;
          let regular_rest_day_rate = hourly_rate * 1.6;

          let total_deduction = round(
            employee.weekly_sss_contribution +
              employee.weekly_hdmf_contribution +
              employee.weekly_philhealth_contribution +
              employee.weekly_wtax
          );

          let reg_days = 0,
            reg_hours = 0,
            ot_hours = 0,
            special_ot_hours = 0,
            rest_day_hours = 0,
            special_holiday_hours = 0,
            regular_holiday_hours = 0,
            special_rest_day_hours = 0,
            regular_rest_day_hours = 0,
            none_taxable_allowance = 0,
            meal_allowance = 0,
            basic_pay = 0,
            ot_pay = 0,
            special_ot_pay = 9,
            total_ot_amount = 0,
            rest_day_pay = 0,
            special_holiday_pay = 0,
            regular_holiday_pay = 0,
            special_rest_day_pay = 0,
            regular_rest_day_pay = 0,
            total_premium_amount = 0,
            total_gross_salary = 0,
            night_diff_hours = 0,
            night_diff_ot_hours = 0,
            night_diff_pay = 0,
            night_diff_ot_pay = 0;
          total_premium_deductions = 0;

          let remarks = null;

          /**
           * get entries from payroll and autosupply what was saved
           */
          if (employee_payroll) {
            ({
              reg_days,
              ot_hours,
              special_ot_hours,
              rest_day_hours,
              special_holiday_hours,
              regular_holiday_hours,
              none_taxable_allowance,
              meal_allowance,
              basic_pay,
              ot_pay,
              special_ot_pay,
              total_ot_amount,
              rest_day_pay,
              special_holiday_pay,
              regular_holiday_pay,
              total_premium_amount,
              total_gross_salary,
              remarks,
              night_diff_hours,
              night_diff_ot_hours,
              night_diff_pay,
              night_diff_ot_pay,
            } = employee_payroll);
          }

          // const attendance = await getEmployeeAttendance({
          //   employee,
          //   period_covered: [
          //     period_covered[0].toDate(),
          //     period_covered[1].toDate(),
          //   ],
          // });

          //OPTIMIZED VERSION
          const attendance =
            results.attendances.filter((o) => {
              // console.log(o?.employee?._id, employee?._id);
              return (
                o?.employee?._id?.toString() === employee?._id?.toString() &&
                moment(o.period_covered?.[0]).isSame(period_covered?.[0]) &&
                moment(o.period_covered?.[1]).isSame(period_covered?.[1])
              );
            })?.[0] || null;

          let payroll_days = [];

          if (attendance) {
            const days = await async.map(attendance.days, async (day) => {
              let night_diff_hours = 0;
              let night_diff_ot_hours = 0;

              if (day.night_diff_hours > 0) {
                night_diff_hours = day.night_diff_hours;
              }
              if (day.night_diff_ot_hours > 0) {
                night_diff_ot_hours = day.night_diff_ot_hours;
              }

              let is_special_holiday = false;
              let is_regular_holiday = false;
              let is_rest_day = day.is_rest_day;

              let reg_days = 0,
                reg_hours = 0,
                ot_hours = 0,
                special_ot_hours = 0,
                rest_day_hours = 0,
                special_holiday_hours = 0,
                regular_holiday_hours = 0,
                special_rest_day_hours = 0,
                regular_rest_day_hours = 0;

              const day_holiday = await getDayStatus(day.date);

              if (day_holiday) {
                is_regular_holiday = day_holiday.is_regular_holiday;
                is_special_holiday = day_holiday.is_special_holiday;
              }

              //check reg hours
              const hours = day.hours;
              if (hours <= 8) {
                reg_hours = hours;
              } else {
                reg_hours = 8;
                ot_hours = hours - reg_hours;
              }

              if (
                ot_hours > 0 &&
                (is_special_holiday || is_regular_holiday || is_rest_day)
              ) {
                special_ot_hours = ot_hours;
                ot_hours = 0;
              }

              reg_days = round(reg_hours / 8, 3);
              //compute for holiday and premium pays

              if (reg_hours > 0) {
                /* if (is_special_holiday && is_rest_day) {
                  //50%
                  special_rest_day_hours = reg_hours;
                } else if (is_regular_holiday && is_rest_day) {
                  //160%

                  regular_rest_day_hours = reg_hours;
                } else  */

                if (is_special_holiday) {
                  //30%
                  special_holiday_hours = reg_hours;
                } else if (is_regular_holiday) {
                  //100%
                  regular_holiday_hours = reg_hours;
                } else if (day.leave_availed) {
                  //possibility of half day
                  reg_hours = 8;
                  reg_days = 1;
                }

                /* else if (is_rest_day) {
                  //30%
                  rest_day_hours = reg_hours;
                } */
              } else if (reg_hours === 0 && is_rest_day) {
                //with pay if rest day
                if (is_special_holiday) {
                  special_holiday_hours = 8;
                } else if (is_regular_holiday) {
                  regular_holiday_hours = 8;
                }
              } else if (
                (reg_hours === 0 || isEmpty(reg_hours)) &&
                is_regular_holiday
              ) {
                regular_holiday_hours = 8;
              } else if (day.leave_availed) {
                reg_hours = 8;
                reg_days = 1;
              }

              // if (employee?.name === "ALALAN, CARIM") {
              //   console.log(day.leave_availed);
              // }

              return {
                ...day,
                is_regular_holiday,
                is_special_holiday,

                reg_days,
                reg_hours,
                ot_hours,
                special_ot_hours,
                rest_day_hours,
                special_holiday_hours,
                regular_holiday_hours,
                special_rest_day_hours,
                regular_rest_day_hours,
                night_diff_hours,
                night_diff_ot_hours,
              };
            });

            night_diff_hours = sumBy(days, (o) => o.night_diff_hours);
            night_diff_ot_hours = sumBy(days, (o) => o.night_diff_ot_hours);
            reg_hours = sumBy(days, (o) => o.reg_hours);
            reg_days = sumBy(days, (o) => o.reg_days);
            ot_hours = sumBy(days, (o) => o.ot_hours);
            special_ot_hours = sumBy(days, (o) => o.special_ot_hours);
            rest_day_hours = sumBy(days, (o) => o.rest_day_hours);
            special_holiday_hours = sumBy(days, (o) => o.special_holiday_hours);
            regular_holiday_hours = sumBy(days, (o) => o.regular_holiday_hours);
            special_rest_day_hours = sumBy(
              days,
              (o) => o.special_rest_day_hours
            );
            regular_rest_day_hours = sumBy(
              days,
              (o) => o.regular_rest_day_hours
            );

            basic_pay = round(daily_rate * round(reg_days, 3));

            ot_pay = round(ot_rate * round(ot_hours));
            special_ot_pay = round(special_ot_rate * round(special_ot_hours));

            rest_day_pay = round(rest_day_rate * round(rest_day_hours));
            special_holiday_pay = round(
              special_holiday_rate * round(special_holiday_hours)
            );
            regular_holiday_pay = round(
              regular_holiday_rate * round(regular_holiday_hours)
            );

            special_rest_day_pay = round(
              special_rest_day_rate * round(special_rest_day_hours)
            );
            regular_rest_day_pay = round(
              regular_rest_day_rate * round(regular_rest_day_hours)
            );

            night_diff_pay = round(hourly_rate * 0.1 * night_diff_hours);
            night_diff_ot_pay = round(
              hourly_rate * 0.375 * night_diff_ot_hours
            );

            total_ot_amount = round(ot_pay + special_ot_pay);

            // console.log(
            //   rest_day_pay,
            //   special_holiday_pay,
            //   regular_holiday_pay,
            //   special_rest_day_pay,
            //   regular_rest_day_pay,
            //   night_diff_pay,
            //   night_diff_ot_pay
            // );

            total_premium_amount = round(
              rest_day_pay +
                special_holiday_pay +
                regular_holiday_pay +
                special_rest_day_pay +
                regular_rest_day_pay
            );

            total_gross_salary = round(
              basic_pay + total_ot_amount + total_premium_amount
            );

            payroll_days = days;
          }

          total_premium_deductions = round(
            (employee.weekly_sss_contribution || 0) +
              (employee.weekly_hdmf_contribution || 0) +
              (employee.weekly_philhealth_contribution || 0) +
              (employee.weekly_wtax || 0)
          );

          return {
            employee,
            period_covered,
            daily_rate: employee.daily_rate,
            hourly_rate,
            ot_rate,
            special_ot_rate,
            rest_day_rate,
            special_holiday_rate,
            regular_holiday_rate,
            special_rest_day_rate,
            regular_rest_day_rate,

            sss_contribution: employee.weekly_sss_contribution,
            hdmf_contribution: employee.weekly_hdmf_contribution,
            philhealth_contribution: employee.weekly_philhealth_contribution,
            wtax: employee.weekly_wtax,
            total_premium_deductions,

            reg_days,
            ot_hours,
            special_ot_hours,
            rest_day_hours,
            special_holiday_hours,
            regular_holiday_hours,
            special_rest_day_hours,
            regular_rest_day_hours,

            meal_allowance,
            basic_pay,
            ot_pay,
            special_ot_pay,
            total_ot_amount,
            rest_day_pay,
            special_holiday_pay,
            regular_holiday_pay,
            special_rest_day_pay,
            regular_rest_day_pay,
            total_premium_amount,
            total_gross_salary,

            days: payroll_days,

            remarks,

            night_diff_hours,
            night_diff_ot_hours,
            night_diff_pay,
            night_diff_ot_pay,
          };
        }
      );
      // console.log("ending...");
      // console.log("getting deductions...");

      _records = await getPayrollDeductions({
        records: payroll,
        period_covered,
      });
      // console.log("ending deductions...");

      /**
       * compute summary
       */

      _records = _records.map((o) => {
        let other_deductions = round(
          sumBy(o.deductions || [], (deduction) =>
            parseFloat(deduction.amount || 0)
          )
        );

        const total_deductions = round(
          (other_deductions || 0) + (o.total_premium_deductions || 0)
        );

        const net_salary_pay = round(
          (o.total_gross_salary || 0) - (total_deductions || 0)
        );

        return {
          ...o,
          other_deductions,
          total_deductions,
          net_salary_pay,
        };
      });

      return res.json({ payroll: _records, days });
    }
  );
});

router.post("/dtr-regular-summary", async (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];

  Payroll.aggregate([
    {
      $match: {
        $or: [
          {
            "period_covered.0": {
              $gte: period_covered[0].clone().toDate(),
            },
          },
          {
            "period_covered.1": {
              $lte: period_covered[1].clone().toDate(),
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$days",
      },
    },
    {
      $match: {
        "days.date": {
          $gte: period_covered[0].clone().toDate(),
          $lte: period_covered[1].clone().toDate(),
        },
      },
    },
    {
      $sort: {
        days: 1,
      },
    },
    {
      $group: {
        _id: "$employee._id",
        employee: {
          $first: "$employee",
        },
        days: {
          $push: "$days",
        },
      },
    },
    {
      $sort: {
        "employee.name": 1,
      },
    },
  ]).then((records) => {
    const days = getDaysInArray({ period_covered });

    const employee_records = records.map((record) => {
      let employee_days = [];
      days.forEach((day) => {
        let d = record.days.find((o) => day.isSame(o.date));

        if (d) {
          employee_days = [...employee_days, d];
        } else {
          employee_days = [...employee_days, { date: day, day: null }];
        }
      });

      const total_days = sumBy(employee_days, (o) => round(o.day ? o.day : 0));

      return {
        ...record,
        days: employee_days,
        total_days,
      };
    });

    return res.json({ records: employee_records, days });
  });
});

router.post("/attendance-summary", async (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];

  Attendance.aggregate([
    {
      $match: {
        "days.date": {
          $gte: period_covered[0].clone().toDate(),
          $lte: period_covered[1].clone().toDate(),
        },
      },
    },
    {
      $unwind: {
        path: "$days",
      },
    },
    {
      $match: {
        "days.date": {
          $gte: period_covered[0].clone().toDate(),
          $lte: period_covered[1].clone().toDate(),
        },
        "days.status": {
          $in: ["Absent", "Late", "No Time-in"],
        },
      },
    },
    {
      $group: {
        _id: {
          employee_id: "$employee._id",
        },
        employee: {
          $first: "$employee",
        },
        absent: {
          $push: {
            $cond: [
              {
                $eq: ["$days.status", "Absent"],
              },
              "$days.date",
              "$$REMOVE",
            ],
          },
        },
        late: {
          $push: {
            $cond: [
              {
                $eq: ["$days.status", "Late"],
              },
              "$days.date",
              "$$REMOVE",
            ],
          },
        },
        no_timein: {
          $push: {
            $cond: [
              {
                $eq: ["$days.status", "No Time-in"],
              },
              "$days.date",
              "$$REMOVE",
            ],
          },
        },
      },
    },
    {
      $sort: {
        "employee.name": 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/period-report", async (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];
  const branch = req.body.branch;

  const { is_cv_form = false, is_fa_cv_form = false } = req.body;

  if (is_cv_form) {
    await updateCheckVoucherRefefence({ period_covered, branch });
  }

  async.parallel(
    {
      payroll: (cb) => {
        Payroll.find({
          period_covered: [
            period_covered[0].clone().toDate(),
            period_covered[1].clone().toDate(),
          ],
          ...(!isEmpty(branch?._id) && {
            "employee.branch._id": ObjectId(branch._id),
          }),
        })
          .sort({
            "employee.name": 1,
          })
          .exec(cb);
      },
      employees: (cb) => {
        Employee.find({}).sort({ name: 1 }).exec(cb);
      },
    },
    (err, results) => {
      if (err) {
        return res.status(401).json(err);
      }

      const days = getDaysInArray({ period_covered });

      return res.json({ payroll: results.payroll, days });
    }
  );
});

router.post("/period-summary-report", async (req, res) => {
  const period_covered = [
    moment(req.body.period_covered[0]).startOf("day"),
    moment(req.body.period_covered[1]).endOf("day"),
  ];

  const records = await getPayrollSummary({ ...req.body, period_covered });

  return res.json({ payroll: records });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const filtered_body = filterId(req);
  const user = req.body.user;

  Model.findById(req.params.id).then((record) => {
    if (record) {
      const datetime = moment.tz(moment(), process.env.TIMEZONE);
      const log = `Modified by ${user.name} on ${datetime.format("LLL")}`;

      const logs = [
        ...record.logs,
        {
          user,
          datetime,
          log,
        },
      ];

      const body = {
        ...filtered_body,
        logs,
      };

      record.set({
        ...body,
      });

      record
        .save()
        .then((record) => {
          return res.json(record);
        })
        .catch((err) => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  Model.findByIdAndRemove(req.params.id)
    .then((response) => res.json({ success: 1 }))
    .catch((err) => console.log(err));
});

module.exports = router;
