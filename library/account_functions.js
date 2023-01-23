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

module.exports.getAccountBalance = ({ _id }) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        debit: (cb) =>
          Sales.aggregate([
            {
              $match: {
                "payments.charge_to_accounts.account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: "$payments.charge_to_accounts",
            },
            {
              $match: {
                "payments.charge_to_accounts.account._id": ObjectId(_id),
              },
            },
            {
              $group: {
                _id: null,
                account: {
                  $first: "$payments.charge_to_accounts.account",
                },
                debit_amount: {
                  $sum: "$payments.charge_to_accounts.amount",
                },
              },
            },
          ]).exec(cb),
        credit: (cb) =>
          AccountCollection.aggregate([
            {
              $match: {
                "account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
                "payments.deposit_total": {
                  $gt: 0,
                },
              },
            },
            {
              $group: {
                _id: null,
                account: {
                  $first: "$account",
                },
                credit_amount: {
                  $sum: "$payments.deposit_total",
                },
              },
            },
          ]).exec(cb),

        account_adjustments: (cb) =>
          AccountAdjustment.aggregate([
            {
              $match: {
                "account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
                amount: {
                  $gt: 0,
                },
              },
            },
            {
              $group: {
                _id: null,
                account: {
                  $first: "$account",
                },
                credit_amount: {
                  $sum: "$amount",
                },
              },
            },
          ]).exec(cb),
      },
      (err, results) => {
        if (err) {
          return reject(err);
        }
        let transactions = [];

        async.eachOf(
          results,
          (value, key, cb) => {
            transactions = [...transactions, ...value];
            cb(null);
          },
          (err) => {
            if (err) {
              return reject(err);
            }

            const balance = transactions.reduce((acc, o) => {
              return round(
                acc + round(o.credit_amount || 0) - round(o.debit_amount || 0)
              );
            }, 0);

            return resolve({ balance });
          }
        );
      }
    );
  });
};

module.exports.getAccountLedger = ({ _id }) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        debit: (cb) =>
          Sales.aggregate([
            {
              $match: {
                "payments.charge_to_accounts.account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: "$payments.charge_to_accounts",
            },
            {
              $match: {
                "payments.charge_to_accounts.account._id": ObjectId(_id),
              },
            },
            {
              $project: {
                date: "$datetime",
                particulars: { $concat: ["OS# ", { $toString: "$sales_id" }] },
                account: "$payments.charge_to_accounts.account",

                debit_amount: "$payments.charge_to_accounts.amount",
                credit_amount: {
                  $literal: 0,
                },
              },
            },
          ]).exec(cb),
        credit: (cb) =>
          AccountCollection.aggregate([
            {
              $match: {
                "account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
                "payments.deposit_total": {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                date: "$datetime",
                particulars: {
                  $concat: ["CR# ", { $toString: "$account_collection_no" }],
                },
                account: "$account",
                debit_amount: {
                  $literal: 0,
                },
                credit_amount: "$payments.deposit_total",
              },
            },
          ]).exec(cb),

        account_adjustments: (cb) =>
          AccountAdjustment.aggregate([
            {
              $match: {
                "account._id": ObjectId(_id),
                deleted: {
                  $exists: false,
                },
                amount: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                date: "$date",
                particulars: {
                  $concat: [
                    "ACCT ADJ# ",
                    { $toString: "$account_adjustment_no" },
                  ],
                },
                account: "$account",
                debit_amount: {
                  $literal: 0,
                },
                credit_amount: "$amount",
              },
            },
          ]).exec(cb),
      },
      (err, results) => {
        if (err) {
          return reject(err);
        }
        let transactions = [];

        async.eachOf(
          results,
          (value, key, cb) => {
            transactions = [...transactions, ...value];
            cb(null);
          },
          (err) => {
            if (err) {
              return reject(err);
            }

            /**
             * sort here
             */

            let sorted_transactions = sortBy(transactions, [
              (o) => moment(o.date).toISOString(),
            ]);

            sorted_transactions.reduce((acc, o, index, arr) => {
              let balance = round(
                acc + round(o.credit_amount || 0) - round(o.debit_amount || 0)
              );

              arr[index].balance = balance;

              return balance;
            }, 0);

            resolve(sorted_transactions);
          }
        );
      }
    );
  });
};
