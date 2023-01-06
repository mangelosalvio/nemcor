const mongoose = require("mongoose");
const moment = require("moment");
const constants = require("../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const round = require("./../utils/round");
const numeral = require("numeral");
const async = require("async");
const isEmpty = require("../validators/isEmpty");
const Payroll = require("../models/Payroll");
const Day = require("../models/Day");
const Counter = require("../models/Counter");
const Employee = require("../models/Employee");
const DailyTimeRecord = require("../models/DailyTimeRecord");
const forOwn = require("lodash").forOwn;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const orderBy = require("lodash").orderBy;
const PayrollAdjustment = require("../models/PayrollAdjustment");
const Attendance = require("../models/Attendance");

const util = require("util");
const ScheduledDeduction = require("../models/ScheduledDeduction");
const { STATUS_PAID, CANCELLED } = require("../config/constants");
const BranchCounter = require("../models/BranchCounter");

const ObjectId = mongoose.Types.ObjectId;

module.exports.getDaysInArray = ({ period_covered }) => {
  const period = [
    moment(period_covered[0]).startOf("day"),
    moment(period_covered[1]).endOf("day"),
  ];

  const date = period[0];
  let dates = [];
  while (date.isBefore(period[1])) {
    dates = [...dates, date.clone().startOf("day")];

    date.add({ day: 1 });
  }

  return dates;
};

module.exports.updateCheckVoucherRefefence = ({ period_covered, branch }) => {
  return new Promise((resolve, reject) => {
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
      .then(async (records) => {
        await asyncForeach(records, async (record) => {
          if (isEmpty(record.cv_no)) {
            const counter_result = await Counter.increment("cv_no");

            record.set({
              cv_no: counter_result.next,
            });
            await record.save();
          }

          if (isEmpty(record.branch_reference)) {
            const counter_result = await BranchCounter.increment(
              "cv_no",
              branch
            );

            const next = counter_result.next;

            const branch_reference = `${branch?.company?.company_code}-${
              branch?.name
            }-${next.toString()?.padStart(5, "0")}`;

            record.set({
              branch_reference,
            });
            await record.save();
          }
        });
        resolve();
      });
  });
};

module.exports.updateCheckVoucherFinancialAssistanceRefefence = ({
  period_covered,
}) => {
  return new Promise((resolve, reject) => {
    Payroll.find({
      period_covered: [
        period_covered[0].clone().toDate(),
        period_covered[1].clone().toDate(),
      ],
      net_financial_assistance: {
        $gt: 0,
      },
    })
      .sort({
        "employee.name": 1,
      })
      .then(async (records) => {
        await asyncForeach(records, async (record) => {
          if (isEmpty(record.fa_cv_no)) {
            const counter_result = await Counter.increment("cv_no");

            record.set({
              fa_cv_no: counter_result.next,
            });
            await record.save();
          }
        });
        resolve();
      });
  });
};

module.exports.upsertEmployeeDTR = ({ day }) => {
  const { is_sunday, is_special_holiday, is_regular_holiday } = day;

  Employee.find({}).then((employees) => {
    async.each(employees, (employee) => {
      if (is_special_holiday || is_regular_holiday) {
        DailyTimeRecord.updateOne(
          {
            date: moment(day.date).startOf("day").toDate(),
            "employee._id": employee._id,
          },
          {
            $set: {
              date: moment(day.date).startOf("day").toDate(),
              employee: employee.toObject(),
              is_sunday,
              is_special_holiday,
              is_regular_holiday,
              none_working_hours: 8,
            },
          },
          {
            upsert: true,
          }
        ).exec();
      } else {
        DailyTimeRecord.updateOne(
          {
            date: moment(day.date).startOf("day").toDate(),
            "employee._id": employee._id,
          },
          {
            $set: {
              date: moment(day.date).startOf("day").toDate(),
              "employee.": employee.toObject(),
              is_sunday,
              is_special_holiday,
              is_regular_holiday,
              none_working_hours: 0,
            },
          },
          {
            upsert: true,
          }
        ).exec();
      }
    });
  });
};

module.exports.previousDayHours = ({ employee, date }) => {
  return new Promise((resolve, reject) => {
    let previous_date = moment(date).subtract({ day: 1 });

    //check if sunday, if sunday, deduct 1 day again

    if (previous_date.day() === 0) {
      previous_date.subtract({ day: 1 });
    }

    DailyTimeRecord.findOne({
      "employee._id": employee._id,
      date: previous_date.toDate(),
    })
      .then((record) => {
        if (record && record.total_shift_hours > 0) {
          resolve(record.total_shift_hours);
        } else {
          resolve(0);
        }
      })
      .catch((err) => reject(err));
  });
};

module.exports.getPayrollAdjustmentsOfEmployee = ({
  period_covered, //moment
  employee, //Employee Object
}) => {
  return new Promise((resolve, reject) => {
    PayrollAdjustment.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          date: {
            $gte: period_covered[0].clone().startOf("day").toDate(),
            $lte: period_covered[1].clone().endOf("day").toDate(),
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.employee._id": employee._id,
        },
      },
      {
        $project: {
          date: "$date",
          employee: "$items.employee",
          particulars: "$items.particulars",
          amount: "$items.amount",
        },
      },
    ])
      .then((records) => {
        resolve(records);
      })
      .catch((err) => reject(err));
  });
};

//used for incentives
module.exports.getAttendanceOfEmployee = ({ period_covered, employee }) => {
  return new Promise((resolve, reject) => {
    Attendance.findOne({
      deleted: {
        $exists: false,
      },
      "period_covered.0": {
        $gte: period_covered[0]
          .clone()
          .subtract(1, "day")
          .startOf("day")
          .toDate(),
      },
      "period_covered.1": {
        $lte: period_covered[1].clone().endOf("day").toDate(),
      },
      "employee._id": employee._id,
    })
      .lean(true)
      .then((record) => {
        resolve(record);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getDayStatus = (date) => {
  return new Promise((resolve, reject) => {
    Day.findOne({
      date: moment(date).startOf("day").toDate(),
    })
      .lean(true)
      .then((record) => {
        resolve(record);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getEmployeeAttendance = ({ employee, period_covered }) => {
  return new Promise((resolve, reject) => {
    Attendance.findOne({
      "employee._id": ObjectId(employee._id),
      period_covered: [
        moment(period_covered[0]).startOf("day").toDate(),
        moment(period_covered[1]).endOf("day").toDate(),
      ],
    })
      .lean(true)
      .then((record) => {
        resolve(record);
      })
      .catch((err) => reject(err));
  });
};

//period covered is in moment
module.exports.getPayrollSummary = ({ ...form_data }) => {
  return new Promise((resolve, reject) => {
    Payroll.aggregate([
      {
        $match: {
          "period_covered.0": {
            $gte: form_data.period_covered[0].clone().toDate(),
          },
          "period_covered.1": {
            $lte: form_data.period_covered[1].clone().toDate(),
          },
          ...(form_data.employee_status && {
            "employee.employee_status": form_data.employee_status,
          }),
          ...(!isEmpty(form_data?.company?._id) && {
            "employee.company._id": ObjectId(form_data.company._id),
          }),
          ...(!isEmpty(form_data.employees) &&
            form_data.employees?.length > 0 && {
              "employee.name": {
                $in: form_data.employees,
              },
            }),
        },
      },
      {
        $group: {
          _id: "$employee._id",
          employee: {
            $first: "$employee",
          },
          daily_rate: {
            $first: "$daily_rate",
          },
          reg_days: {
            $sum: "$reg_days",
          },
          basic_pay: {
            $sum: "$basic_pay",
          },
          ot_hours: {
            $sum: "$ot_hours",
          },
          special_ot_hours: {
            $sum: "$special_ot_hours",
          },
          total_ot_amount: {
            $sum: "$total_ot_amount",
          },
          special_holiday_hours: {
            $sum: "$special_holiday_hours",
          },
          regular_holiday_hours: {
            $sum: "$regular_holiday_hours",
          },
          total_premium_amount: {
            $sum: "$total_premium_amount",
          },
          none_taxable_allowance: {
            $sum: "$none_taxable_allowance",
          },
          meal_allowance: {
            $sum: "$meal_allowance",
          },
          total_gross_salary: {
            $sum: "$total_gross_salary",
          },
          sss_contribution: {
            $sum: "$sss_contribution",
          },
          hdmf_contribution: {
            $sum: "$hdmf_contribution",
          },
          philhealth_contribution: {
            $sum: "$philhealth_contribution",
          },
          wtax: {
            $sum: "$wtax",
          },

          total_deduction: {
            $sum: "$total_deduction",
          },
          total_adjustment_amount: {
            $sum: "$total_adjustment_amount",
          },
          net_salary_pay: {
            $sum: "$net_salary_pay",
          },
          incentive_total_amount: {
            $sum: "$incentive.total_amount",
          },
        },
      },
      {
        $addFields: {
          total_pay: {
            $add: ["$net_salary_pay", "$incentive_total_amount"],
          },
          net_of_adjustments: {
            $subtract: ["$total_gross_salary", "$total_deduction"],
          },
        },
      },
      {
        $sort: {
          "employee.name": 1,
        },
      },
    ])
      .then((records) => resolve(records))
      .catch((err) => reject(err));
  });
};

module.exports.getNumberOfPersonsWithIncentives = ({ date }) => {
  return new Promise(async (resolve, reject) => {
    const count = await Day.countDocuments({
      date: {
        $gte: moment(date).startOf("day").toDate(),
        $lte: moment(date).endOf("day").toDate(),
      },
      has_no_operations: true,
    });

    if (count > 0) resolve(0);

    const form_data = [
      {
        $match: {
          deleted: {
            $exists: false,
          },
          "days.date": {
            $gte: moment(date).startOf("day").toDate(),
            $lte: moment(date).endOf("day").toDate(),
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee._id",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $addFields: {
          employee: {
            $arrayElemAt: ["$employee", 0],
          },
        },
      },
      {
        $unwind: "$days",
      },
      {
        $match: {
          "days.date": {
            $gte: moment(date).startOf("day").toDate(),
            $lte: moment(date).endOf("day").toDate(),
          },
          "employee.has_incentives": true,

          $or: [
            {
              "days.status": "Present",
            },
            {
              "days.status": {
                $ne: "Penalty",
              },
              "days.is_rest_day": true,
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ];

    // console.log(util.inspect(form_data, false, null, true));

    Attendance.aggregate(form_data)
      .allowDiskUse(true)
      .then((records) => {
        const count = records?.[0]?.count || 0;
        // console.log(date, count);
        return resolve(count);
      })
      .catch((err) => reject(err));
  });
};

module.exports.computeIncentive = ({ no_of_cups, no_of_pax, has_switch }) => {
  return new Promise((resolve, reject) => {
    IncentiveProgram.findOne({
      from_range: {
        $lte: no_of_cups,
      },
      to_range: {
        $gte: no_of_cups,
      },
    })
      .then((record) => {
        //if there is a switch, automatically make equivalent incentives and incentive amount to 0
        if (has_switch) {
          return resolve({
            equivalent_incentives: 0,
            incentive_amount: 0,
          });
        }

        if (record) {
          if (record.is_divided_per_pax && no_of_pax > 0) {
            return resolve({
              equivalent_incentives: record.incentive_amount,
              incentive_amount: round(record.incentive_amount / no_of_pax),
            });
          } else if (no_of_pax <= 0) {
            return resolve({
              equivalent_incentives: 0,
              incentive_amount: 0,
            });
          } else {
            return resolve({
              equivalent_incentives: record.incentive_amount,
              incentive_amount: record.incentive_amount,
            });
          }
        }
        return resolve({ equivalent_incentives: 0, incentive_amount: 0 });
      })
      .catch((err) => reject(err));
  });
};

module.exports.getIncentivesSummaryReport = ({ period_covered }) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        total_incentives: (cb) => {
          Payroll.aggregate([
            {
              $match: {
                "period_covered.0": {
                  $gte: moment(period_covered[0]).startOf("day").toDate(),
                },
                "period_covered.1": {
                  $lte: moment(period_covered[1]).endOf("day").toDate(),
                },
              },
            },
            {
              $group: {
                _id: null,
                incentive_amount: {
                  $sum: {
                    $ifNull: ["$incentive.total_amount", 0],
                  },
                },
              },
            },
          ]).exec(cb);
        },
        total_cups: (cb) => {
          Incentive.aggregate([
            {
              $match: {
                "period_covered.0": {
                  $gte: moment(period_covered[0])
                    .subtract({ day: 1 })
                    .startOf("day")
                    .toDate(),
                },
                "period_covered.1": {
                  $lte: moment(period_covered[1]).endOf("day").toDate(),
                },
              },
            },
            {
              $unwind: "$items",
            },
            {
              $group: {
                _id: null,
                total_cups: {
                  $sum: "$items.no_of_cups",
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          return reject(err);
        }

        return resolve({
          total_cups: results.total_cups?.[0]?.total_cups || 0,
          total_incentives:
            results.total_incentives?.[0]?.incentive_amount || 0,
        });
      }
    );
  });
};

module.exports.getPayrollDeductions = ({ records, period_covered }) => {
  return new Promise(async (resolve, reject) => {
    const _records = await async.mapLimit(records, 10, async (record) => {
      const payroll_record = await Payroll.findOne({
        period_covered: [
          moment(period_covered[0]).startOf("day").toDate(),
          moment(period_covered[1]).endOf("day").toDate(),
        ],
        "employee._id": ObjectId(record.employee?._id),
      });

      let deductions = !isEmpty(payroll_record)
        ? payroll_record.deductions
        : [];

      //check if scheduled deductions

      let scheduled_deductions = await ScheduledDeduction.aggregate([
        {
          //REMOVE COMMENT IF STABLE NA...
          $match: {
            // status: {
            //   $ne: STATUS_PAID,
            // },
            start_date: {
              $lte: moment(period_covered[1]).endOf("day").toDate(),
            },
            "employee._id": ObjectId(record.employee?._id),
            "status.approval_status": {
              $ne: CANCELLED,
            },
          },
        },
      ]);

      scheduled_deductions = await async.mapLimit(
        scheduled_deductions,
        10,
        async (o) => {
          //check total deductions from the payroll
          //get all previous payroll deductions
          const records = await Payroll.aggregate([
            {
              $match: {
                "period_covered.1": {
                  $lt: moment(period_covered[0]).startOf("day").toDate(),
                },
                "deductions.scheduled_deduction_id": ObjectId(o._id),
              },
            },
            {
              $unwind: "$deductions",
            },
            {
              $match: {
                "deductions.scheduled_deduction_id": ObjectId(o._id),
              },
            },
            {
              $group: {
                _id: null,
                amount: {
                  $sum: "$deductions.amount",
                },
              },
            },
          ]);

          //checks total deductions

          const total_payroll_deductions = records?.[0]?.amount || 0;

          const balance = round(o.total_amount - total_payroll_deductions);

          let deduction_amount = o.deduction_amount;

          if (balance < o.deduction_amount) {
            deduction_amount = balance;
          }

          //if balance is less than 0 update the status of deduction
          if (balance <= 0) {
            await ScheduledDeduction.updateOne(
              {
                _id: ObjectId(o._id),
              },
              {
                $set: {
                  status: STATUS_PAID,
                },
              }
            );
          }

          return {
            ...o,
            deduction_amount,
          };
        }
      );

      // if (record.employee?.name === "ALALAN, CARIM") {
      //   console.log(deductions);
      //   // console.log(scheduled_deductions);
      // }

      //remove deductions that is included in scheduled_deductions and is empty

      deductions = (deductions || []).filter((o) => {
        // if (record.employee?.name === "ALALAN, CARIM") {
        //   console.log(o.amount);
        // }

        return (
          !scheduled_deductions
            .map((j) => j.deduction?.name)
            .includes(o.deduction) || o.amount > 0
        );
      });

      //do not include scheduled deducions that are already in deductions

      deductions = [
        ...deductions,
        ...scheduled_deductions
          .filter((o) => {
            //remove those that are already in deductions
            return !deductions
              .map((o) => o.deduction)
              .includes(o.deduction?.name);
          })
          .map((o) => {
            return {
              deduction: o.deduction?.name,
              amount: o.deduction_amount,
              scheduled_deduction_id: o._id,
            };
          }),
      ];

      // console.log(deductions);

      return {
        ...record,
        deductions,
      };
    });

    return resolve(_records);
  });
};
