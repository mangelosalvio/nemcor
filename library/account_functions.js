const mongoose = require("mongoose");
const moment = require("moment");
const constants = require("../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const round = require("./../utils/round");
const numeral = require("numeral");
const async = require("async");
const isEmpty = require("../validators/is-empty");
const Counter = require("../models/Counter");
const Sales = require("../models/Sales");
const StockReleasing = require("../models/StockReleasing");

const StockReceiving = require("../models/StockReceiving");
const Stock = require("../models/Product");
const forOwn = require("lodash").forOwn;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const orderBy = require("lodash").orderBy;
const sortBy = require("lodash").sortBy;

const ObjectId = mongoose.Types.ObjectId;

const axios = require("axios");
const Production = require("../models/Production");
const { getSettingValueFromKey } = require("./setting_functions");
const AccountCollection = require("../models/AccountCollection");
const AccountAdjustment = require("../models/AccountAdjustment");
const DeliveryReceipt = require("../models/DeliveryReceipt");

module.exports.getAccountBalance = ({ account, date, branch }) => {
  return new Promise(async (resolve, reject) => {
    let from_date = null;
    let to_date = moment(date).endOf("day").toDate();

    DeliveryReceipt.aggregate([
      {
        $match: {
          ...(branch?._id && {
            "branch._id": ObjectId(branch._id),
          }),

          "account._id": ObjectId(account._id),
          "status.approval_status": {
            $ne: constants.CANCELLED,
          },
          payment_type: constants.PAYMENT_TYPE_CHARGE,
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: { $ifNull: ["$items.amount", 0] },
          },
        },
      },
      {
        $unionWith: {
          coll: "customer_collections",
          pipeline: [
            {
              $match: {
                "status.approval_status": {
                  $ne: constants.CANCELLED,
                },
                ...(branch?._id && {
                  "branch._id": ObjectId(branch._id),
                }),
                "account._id": ObjectId(account._id),
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$delivery_items",
            },
            {
              $group: {
                _id: null,
                amount: {
                  $sum: {
                    $subtract: [0, "$delivery_items.payment_amount"],
                  },
                },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: { $ifNull: ["$amount", 0] },
          },
        },
      },
    ])
      .allowDiskUse(true)
      .then((records) => {
        console.log(records);
        return resolve(records?.[0]?.amount ?? 0);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

module.exports.getAccountLedgerDetailed = ({
  branch,
  period_covered,
  account,
  ...rest
}) => {
  return new Promise(async (resolve, reject) => {
    let from_date = moment(period_covered[0])
      .subtract({ day: 1 })
      .endOf("day")
      .toDate();

    let to_date = moment(period_covered[1]).endOf("day").toDate();

    const beginning_balance = await this.getAccountBalance({
      account,
      date: moment(period_covered[0])
        .subtract({ day: 1 })
        .endOf("day")
        .toDate(),
      branch,
    });

    console.log(beginning_balance);

    DeliveryReceipt.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          ...(branch?._id && {
            "branch._id": ObjectId(branch._id),
          }),
          "account._id": ObjectId(account._id),
          "status.approval_status": {
            $ne: constants.CANCELLED,
          },
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $addFields: {
          transaction: "Sales",
        },
      },
      {
        $project: {
          date: "$date",
          transaction: "$transaction",
          reference: "$reference",
          description: "$items.stock.name",
          quantity: "$items.quantity",
          price: "$items.price",
          amount: "$items.amount",
        },
      },
      {
        $unionWith: {
          coll: "customer_collections",
          pipeline: [
            {
              $match: {
                ...(branch?._id && {
                  "branch._id": ObjectId(branch._id),
                }),
                "account._id": ObjectId(account._id),
                "status.approval_status": {
                  $ne: constants.CANCELLED,
                },
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $unwind: "$delivery_items",
            },
            {
              $addFields: {
                transaction: "Payments",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["$reference", "/", "$delivery_items.reference"],
                },
                amount: {
                  $subtract: [0, "$delivery_items.payment_amount"],
                },
                description: {
                  $reduce: {
                    input: "$payments",
                    initialValue: "",
                    in: {
                      $cond: {
                        if: {
                          $eq: ["$$this.payment_method", "CASH"],
                        },
                        then: {
                          $concat: [
                            "$$value",
                            "$$this.payment_method",
                            ":",
                            "$$this.amount",
                            " ;",
                          ],
                        },
                        else: {
                          $concat: [
                            "$$value",
                            "$$this.bank",
                            "#",
                            "$$this.check_no",
                            " ",
                            {
                              $dateToString: {
                                date: "$$this.check_date",
                                format: "%m/%d/%Y",
                                timezone: "Asia/Manila",
                                onNull: "No check date",
                              },
                            },
                            " ",
                            { $ifNull: ["$$this.reference", ""] },
                            "; ",
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ])
      .then((records) => {
        let updated_records = [
          { transaction: "Opening Balance", amount: beginning_balance },
          ...records,
        ];

        updated_records.reduce((acc, o, index, array) => {
          acc = round(acc + o.amount);
          array[index]["balance"] = acc;
          return acc;
        }, 0);

        return resolve(updated_records);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

//SUMMARY
module.exports.getAccountLedger = ({
  branch,
  period_covered,
  account,
  ...rest
}) => {
  return new Promise(async (resolve, reject) => {
    let from_date = moment(period_covered[0])
      .subtract({ day: 1 })
      .endOf("day")
      .toDate();

    let to_date = moment(period_covered[1]).endOf("day").toDate();

    const beginning_balance = await this.getAccountBalance({
      account,
      date: moment(period_covered[0])
        .subtract({ day: 1 })
        .endOf("day")
        .toDate(),
      branch,
    });

    console.log(beginning_balance);

    DeliveryReceipt.aggregate([
      {
        $match: {
          deleted: {
            $exists: false,
          },
          ...(branch?._id && {
            "branch._id": ObjectId(branch._id),
          }),
          "account._id": ObjectId(account._id),
          "status.approval_status": {
            $ne: constants.CANCELLED,
          },
          date: {
            ...(from_date && {
              $gt: from_date,
            }),
            $lte: to_date,
          },
        },
      },
      {
        $addFields: {
          transaction: "Sales",
        },
      },
      {
        $project: {
          date: "$date",
          transaction: "$transaction",
          reference: "$reference",
          amount: "$total_amount",
        },
      },
      {
        $unionWith: {
          coll: "customer_collections",
          pipeline: [
            {
              $match: {
                ...(branch?._id && {
                  "branch._id": ObjectId(branch._id),
                }),
                "account._id": ObjectId(account._id),
                "status.approval_status": {
                  $ne: constants.CANCELLED,
                },
                date: {
                  ...(from_date && {
                    $gt: from_date,
                  }),
                  $lte: to_date,
                },
              },
            },
            {
              $addFields: {
                transaction: "Payments",
              },
            },
            {
              $project: {
                date: "$date",
                transaction: "$transaction",
                reference: {
                  $concat: ["$reference"],
                },
                amount: {
                  $subtract: [0, "$total_payment_amount"],
                },
                description: {
                  $reduce: {
                    input: "$payments",
                    initialValue: "",
                    in: {
                      $cond: {
                        if: {
                          $eq: ["$$this.payment_method", "CASH"],
                        },
                        then: {
                          $concat: [
                            "$$value",
                            "$$this.payment_method",
                            ":",
                            "$$this.amount",
                            " ;",
                          ],
                        },
                        else: {
                          $concat: [
                            "$$value",
                            "$$this.bank",
                            "#",
                            "$$this.check_no",
                            " ",
                            {
                              $dateToString: {
                                date: "$$this.check_date",
                                format: "%m/%d/%Y",
                                timezone: "Asia/Manila",
                                onNull: "No check date",
                              },
                            },
                            " ",
                            { $ifNull: ["$$this.reference", ""] },
                            "; ",
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ])
      .then((records) => {
        let updated_records = [
          { transaction: "Opening Balance", amount: beginning_balance },
          ...records,
        ];

        updated_records.reduce((acc, o, index, array) => {
          acc = round(acc + o.amount);
          array[index]["balance"] = acc;
          return acc;
        }, 0);

        return resolve(updated_records);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};
