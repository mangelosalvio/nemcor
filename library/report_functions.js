const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Inventory = require("./../models/Inventory");
const Sales = require("./../models/Sales");
const SalesOtherSet = require("./../models/SalesOtherSet");
const BranchInventory = require("./../models/BranchInventory");
const AccountSetting = require("./../models/AccountSetting");
const numeral = require("numeral");
const round = require("./../utils/round");
const constants = require("./../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const DeletedOrder = require("./../models/DeletedOrder");
const async = require("async");
const { constant, reject } = require("lodash");
const TruckTally = require("../models/TruckTally");
const PurchaseOrder = require("../models/PurchaseOrder");
const {
  CANCELLED,
  PO_STATUS_ACCOMPLISHED,
  STATUS_PAID,
} = require("./../config/constants");
const SupplierWithdrawal = require("../models/SupplierWithdrawal");
const TankerWithdrawal = require("../models/TankerWithdrawal");
const DeliveryReceipt = require("../models/DeliveryReceipt");
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const union = require("lodash").union;
const sortBy = require("lodash").sortBy;

const ObjectId = mongoose.Types.ObjectId;
module.exports.getPeriodFromRequest = ({ from_date, to_date }) => {
  return new Promise(async (resolve, reject) => {
    let from_datetime = moment(from_date);
    let to_datetime = moment(to_date);

    const closing_time_result = await AccountSetting.findOne({
      key: constants.CLOSING_TIME,
    });

    const closing_time = moment(closing_time_result.value);

    const opening_time_result = await AccountSetting.findOne({
      key: constants.OPENING_TIME,
    });

    const opening_time = moment(opening_time_result.value);

    from_datetime = moment(
      `${from_datetime.clone().format("YYYY-MM-DD")} ${opening_time.format(
        "HH:mm"
      )}`
    );

    if (opening_time.hours() > closing_time.hours()) {
      /**
       * next day closing
       */
      to_datetime = moment(
        `${to_datetime.clone().format("YYYY-MM-DD")} ${closing_time.format(
          "HH:mm"
        )}`
      ).add({ day: 1 });
    } else {
      /**
       * on day closing
       */
      to_datetime = moment(
        `${to_datetime.clone().format("YYYY-MM-DD")} ${moment(
          closing_time
        ).format("HH:mm")}`
      );
    }
    resolve({
      from_datetime,
      to_datetime,
    });
  });
};

module.exports.getStoreHours = (datetime) => {
  return new Promise(async (resolve, reject) => {
    const now = moment(datetime);

    const closing_time_result = await AccountSetting.findOne({
      key: constants.CLOSING_TIME,
    });

    const closing_time = moment(closing_time_result.value);

    const opening_time_result = await AccountSetting.findOne({
      key: constants.OPENING_TIME,
    });

    const opening_time = moment(opening_time_result.value);

    let start_time;

    if (
      now.clone().hours() >= opening_time.hours() &&
      now.clone().hours() <= 23
    ) {
      /**
       * closed with in the same day (early closing)
       */
      start_time = moment(
        `${now.clone().format("YYYY-MM-DD")} ${opening_time.format("HH:mm")}`
      );
    } else {
      /**
       * next day closing
       */

      start_time = moment(
        `${now.clone().format("YYYY-MM-DD")} ${opening_time.format("HH:mm")}`
      ).subtract({ day: 1 });
    }

    if (opening_time.hours() > closing_time.hours()) {
      /**
       * next day closing
       */
      end_time = moment(
        `${now.clone().format("YYYY-MM-DD")} ${closing_time.format("HH:mm")}`
      ).add({ day: 1 });
    } else {
      /**
       * on day closing
       */
      end_time = moment(
        `${now.clone().format("YYYY-MM-DD")} ${moment(closing_time).format(
          "HH:mm"
        )}`
      );
    }
    resolve({
      start_time,
      end_time,
    });
  });
};

module.exports.getSalesCount = ({ from_date, to_date }) => {
  return new Promise(async (resolve, reject) => {
    const from_datetime = moment(from_date);
    const to_datetime = moment(to_date);

    const count = await Sales.countDocuments({
      datetime: {
        $gte: from_datetime.toDate(),
        $lte: to_datetime.toDate(),
      },
    });

    resolve(count);
  });
};

module.exports.getUniqProductsFromDataSet = ({ data = [] }) => {
  return new Promise((resolve, reject) => {
    let products = union(...data);
    let uniq_products = uniqBy(
      products.map((o) => o.product),
      (o) => {
        return o._id;
      }
    );

    uniq_products = sortBy(uniq_products, [(o) => o.name]);
    resolve(uniq_products);
  });
};

module.exports.getConsolidatedSales = ({ from_datetime, to_datetime }) => {
  return new Promise((resolve, reject) => {
    const Models = [Sales, SalesOtherSet];
    let transactions = [];

    async.each(
      Models,
      (Model, cb) => {
        Model.aggregate([
          {
            $match: {
              datetime: {
                $gte: from_datetime.toDate(),
                $lte: to_datetime.toDate(),
              },
              deleted: {
                $exists: false,
              },
            },
          },
          {
            $unwind: {
              path: "$items",
            },
          },
          {
            $group: {
              _id: "$items.product._id",
              product: {
                $first: "$items.product",
              },
              total_quantity: {
                $sum: "$items.quantity",
              },
              net_sales: {
                $sum: "$items.net_amount",
              },
              net_of_vat: {
                $sum: {
                  $add: ["$items.vatable_amount", "$items.vat_exempt_amount"],
                },
              },
            },
          },
          {
            $sort: {
              product: 1,
            },
          },
        ]).then((records) => {
          transactions = [...transactions, ...records];
          cb(null);
        });
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        let uniq_products = uniqBy(
          transactions.map((o) => o.product),
          (o) => o._id
        );

        uniq_products = sortBy(uniq_products, [(o) => o.name]);
        uniq_products = uniq_products.map((product) => {
          let product_transactions = transactions.filter(
            (o) => o.product._id === product._id
          );

          const net_sales = sumBy(product_transactions, (o) => o.net_sales);

          const total_quantity = sumBy(
            product_transactions,
            (o) => o.total_quantity
          );

          const net_of_vat = sumBy(product_transactions, (o) => o.net_of_vat);

          return {
            product,
            net_sales,
            net_of_vat,
            total_quantity,
          };
        });

        resolve(uniq_products);
      }
    );
  });
};

module.exports.getConsolidatedSalesByDay = ({ from_datetime, to_datetime }) => {
  return new Promise((resolve, reject) => {
    const Models = [Sales, SalesOtherSet];
    let transactions = [];

    async.each(
      Models,
      (Model, cb) => {
        Model.aggregate([
          {
            $match: {
              datetime: {
                $gte: from_datetime.toDate(),
                $lte: to_datetime.toDate(),
              },
              deleted: {
                $exists: false,
              },
            },
          },

          {
            $group: {
              _id: {
                year: {
                  $year: {
                    date: "$datetime",
                    timezone: process.env.TIMEZONE,
                  },
                },
                day_of_year: {
                  $dayOfYear: {
                    date: "$datetime",
                    timezone: process.env.TIMEZONE,
                  },
                },
              },
              datetime: {
                $first: "$datetime",
              },
              net_amount: {
                $sum: "$summary.net_amount",
              },
              vat_amount: {
                $sum: "$summary.vat_amount",
              },
              free_of_charge_payments_total: {
                $sum: "$summary.free_of_charge_payments_total",
              },
            },
          },
          {
            $addFields: {
              day: {
                $concat: [
                  { $toString: "$_id.year" },
                  "/",
                  { $toString: "$_id.day_of_year" },
                ],
              },
              net_sales: {
                $subtract: ["$net_amount", "$vat_amount"],
              },
            },
          },
          {
            $sort: {
              day: 1,
            },
          },
        ]).then((records) => {
          let sales_records;
          if (Model.collection.collectionName === constants.SALES_MODEL) {
            sales_records = (records || []).map((record) => {
              net_sales = round(
                record.net_amount -
                  record.free_of_charge_payments_total -
                  record.vat_amount
              );

              return {
                ...record,
                net_sales,
              };
            });
          } else if (
            Model.collection.collectionName === constants.SALES_OTHER_SET_MODEL
          ) {
            sales_records = (records || []).map((record) => {
              net_sales = round(
                record.net_amount - record.free_of_charge_payments_total
              );

              return {
                ...record,
                net_sales,
                vat_amount: 0,
              };
            });
          }

          transactions = [...transactions, ...sales_records];
          cb(null);
        });
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        let uniq_days = uniqBy(
          transactions.map((o) => o._id),
          (o) => `${o.year}/${o.day_of_year}`
        );

        uniq_days = sortBy(uniq_days, [(o) => `$}{o.year}/${o.day_of_year}`]);

        uniq_days = uniq_days.map((date) => {
          let day_transactions = transactions.filter(
            (o) =>
              o._id.year === date.year && o._id.day_of_year === date.day_of_year
          );

          const net_amount = sumBy(day_transactions, (o) => o.net_amount);

          const vat_amount = sumBy(day_transactions, (o) => o.vat_amount);

          const free_of_charge_payments_total = sumBy(
            day_transactions,
            (o) => o.free_of_charge_payments_total
          );

          const net_sales = sumBy(day_transactions, (o) => o.net_sales);

          return {
            datetime:
              day_transactions.length > 0
                ? moment(day_transactions[0].datetime).startOf("day")
                : null,
            net_amount,
            vat_amount,
            net_sales,
            free_of_charge_payments_total,
          };
        });

        resolve(uniq_days);
      }
    );
  });
};

module.exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports.getDeliveryReportFromTruckTally = (_id) => {
  return new Promise((resolve, reject) => {
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.customer._id",
          customer: {
            $first: "$items.customer",
          },

          total_amount: {
            $sum: "$items.amount",
          },
          items: {
            $push: "$items",
          },
          drs: {
            $addToSet: "$items.dr_no",
          },
          ds: {
            $addToSet: "$items.ds_no",
          },
        },
      },
      {
        $sort: {
          location: 1,
          "customer.location.name": 1,
          "customer.name": 1,
        },
      },
    ])
      .then((records) => resolve(records))
      .catch((err) => reject(err));
  });
};

module.exports.getDeliveryReceiptFromTruckTally = (_id) => {
  return new Promise((resolve, reject) => {
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },

      {
        $addFields: {
          "items.date": "$date",
        },
      },
      {
        $replaceRoot: {
          newRoot: "$items",
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            customer_id: "$customer._id",
            stock_id: "$stock._id",
            price: "$price",
          },
          ds_no: {
            $addToSet: "$ds_no",
          },
          date: {
            $first: "$date",
          },
          customer: {
            $first: "$customer",
          },
          stock: {
            $first: "$stock",
          },
          price: {
            $first: "$price",
          },
          quantity: {
            $sum: "$quantity",
          },
          amount: {
            $sum: "$amount",
          },
        },
      },
      {
        $group: {
          _id: {
            customer_id: "$customer._id",
            date: "$date",
          },
          ds_no: {
            $push: "$ds_no",
          },
          customer: {
            $first: "$customer",
          },
          items: {
            $push: {
              stock: "$stock",
              price: "$price",
              quantity: "$quantity",
              amount: "$amount",
            },
          },
        },
      },
      {
        $addFields: {
          ds_no: {
            $reduce: {
              input: "$ds_no",
              initialValue: [],
              in: {
                $setUnion: ["$$value", "$$this"],
              },
            },
          },
        },
      },
      {
        $sort: {
          "customer.location.name": 1,
        },
      },
    ])
      .then((records) => resolve(records))
      .catch((err) => reject(err));
  });
};

module.exports.getDeliveryReportForReceipt = ({ truck_tally }) => {
  return new Promise((resolve, reject) => {
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(truck_tally?._id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: {
            customer_id: "$items.customer._id",
            location_id: "$items.location._id",
          },
          customer: {
            $first: "$items.customer",
          },
          location: {
            $first: "$items.customer.location",
          },
          total_amount: {
            $sum: "$items.amount",
          },
          ds_no: {
            $addToSet: "$items.ds_no",
          },
        },
      },
      {
        $group: {
          _id: "$location._id",
          location: {
            $first: "$location",
          },
          items: {
            $push: "$$ROOT",
          },
        },
      },
    ])
      .then((records) => {
        return resolve(records);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

module.exports.getCustomerTransactionFromTruckTally = ({
  customer,
  truck_tally,
}) => {
  return new Promise((resolve, reject) => {
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(truck_tally?._id),
        },
      },
      {
        $unwind: {
          path: "$items",
        },
      },
      {
        $match: {
          "items.customer._id": ObjectId(customer?._id),
        },
      },

      {
        $addFields: {
          "items.date": "$date",
        },
      },
      {
        $replaceRoot: {
          newRoot: "$items",
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            customer_id: "$customer._id",
            stock_id: "$stock._id",
            price: "$price",
          },
          ds_no: {
            $addToSet: "$ds_no",
          },
          date: {
            $first: "$date",
          },
          customer: {
            $first: "$customer",
          },
          stock: {
            $first: "$stock",
          },
          price: {
            $first: "$price",
          },
          quantity: {
            $sum: "$quantity",
          },
          amount: {
            $sum: "$amount",
          },
        },
      },
      {
        $group: {
          _id: {
            customer_id: "$customer._id",
            date: "$date",
          },
          ds_no: {
            $push: "$ds_no",
          },
          customer: {
            $first: "$customer",
          },
          items: {
            $push: {
              stock: "$stock",
              price: "$price",
              quantity: "$quantity",
              amount: "$amount",
            },
          },
        },
      },
      {
        $addFields: {
          ds_no: {
            $reduce: {
              input: "$ds_no",
              initialValue: [],
              in: {
                $setUnion: ["$$value", "$$this"],
              },
            },
          },
        },
      },
    ])
      .then((records) => {
        return resolve(records?.[0] || null);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getUnlistedPurchaseOrderReport = ({
  period_covered,
  supplier,
}) => {
  return new Promise((resolve, reject) => {
    PurchaseOrder.aggregate([
      {
        $match: {
          "status.approval_status": {
            $ne: CANCELLED,
          },
          po_status: {
            $ne: PO_STATUS_ACCOMPLISHED,
          },
          ...(period_covered?.[0] &&
            period_covered?.[1] && {
              date: {
                $gte: moment(period_covered?.[0]).startOf("day").toDate(),
                $lte: moment(period_covered?.[1]).endOf("day").toDate(),
              },
            }),
          ...(supplier?._id && {
            "supplier._id": ObjectId(supplier._id),
          }),
        },
      },
      {
        $addFields: {
          "items.po_no": "$po_no",
          "items.supplier": "$supplier",
          "items.date": "$date",
        },
      },
      {
        $unwind: "$items",
      },
      {
        $replaceRoot: {
          newRoot: "$items",
        },
      },
      {
        $match: {
          $expr: {
            $lt: ["$confirmed_quantity", "$quantity"],
          },
        },
      },
      {
        $sort: {
          "supplier.name": 1,
          po_no: 1,
        },
      },
    ])
      .allowDiskUse(true)
      .then((records) => {
        return resolve(records);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

module.exports.purchaseOrderToCollectionReport = ({ period_covered }) => {
  return new Promise(async (resolve, reject) => {
    const purchase_orders = await PurchaseOrder.aggregate([
      {
        $match: {
          "status.approval_status": {
            $ne: CANCELLED,
          },
          date: {
            $gte: moment(period_covered?.[0]).startOf("day").toDate(),
            $lte: moment(period_covered?.[1]).endOf("day").toDate(),
          },
        },
      },
    ])
      .allowDiskUse(true)
      .then((records) => {
        const _records = async.mapSeries(records, async (po) => {
          const supplier_withdrawals = await SupplierWithdrawal.aggregate([
            {
              $match: {
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "purchase_order._id": ObjectId(po._id),
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ]);

          const withdrawals = await TankerWithdrawal.aggregate([
            {
              $match: {
                "status.approval_status": {
                  $ne: CANCELLED,
                },
                "source_tankers.supplier_withdrawal_id": {
                  $in: supplier_withdrawals.map((o) => ObjectId(o._id)),
                },
              },
            },
          ]);

          console.log(supplier_withdrawals);

          return {
            ...po,
          };
        });

        return resolve(_records);
      });
  });
};

module.exports.getStatementOfAccount = ({ date, account, branch }) => {
  return new Promise((resolve, reject) => {
    DeliveryReceipt.aggregate([
      {
        $match: {
          due_date: {
            $lte: moment(date).endOf("day").toDate(),
          },
          "status.approval_status": {
            $nin: [CANCELLED, STATUS_PAID],
          },
          ...(account?._id && {
            "account._id": ObjectId(account._id),
          }),
          ...(branch?._id && {
            "branch._id": ObjectId(branch._id),
          }),
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
      {
        $group: {
          _id: "$account._id",
          account: {
            $first: "$account",
          },
          items: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $sort: {
          "account.name": 1,
        },
      },
    ])
      .allowDiskUse(true)
      .then((records) => {
        // console.log(records);
        return resolve(records);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};
