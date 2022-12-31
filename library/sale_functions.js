const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Inventory = require("./../models/Inventory");
const AccountSetting = require("./../models/AccountSetting");
const numeral = require("numeral");
const round = require("./../utils/round");
const constants = require("./../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const DeletedOrder = require("./../models/DeletedOrder");
const async = require("async");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const CounterOtherSet = require("../models/CounterOtherSet");

const Sales = require("../models/Sales");
const SalesOtherSet = require("../models/SalesOtherSet");

const Xread = require("../models/Xread");
const XreadOtherSet = require("../models/XreadOtherSet");
const SalesReturns = require("../models/SalesReturns");
const SalesReturnsOtherSet = require("../models/SalesReturnsOtherSet");
const {
  getStoreHours,
  getSalesCount,
  getPeriodFromRequest,
} = require("./report_functions");
const Zread = require("../models/Zread");
const ZreadOtherSet = require("../models/ZreadOtherSet");
const AccountCollection = require("../models/AccountCollection");
const isEmpty = require("../validators/is-empty");
const CashCount = require("../models/CashCount");
const GiftCheck = require("../models/GiftCheck");
const { getStoreWarehouse } = require("./setting_functions");

module.exports.udpateMeatTypesOfProductInSales = ({ product }) => {
  const SalesModels = [Sales, SalesOtherSet];

  async.each(SalesModels, (SalesModel) => {
    SalesModel.updateMany(
      {},
      {
        $set: {
          "items.$[elem].product.meat_types": product.meat_types,
        },
      },
      {
        arrayFilters: [
          {
            "elem.product._id": product._id.toString(),
          },
        ],
        multi: true,
      }
    ).exec();
  });
};

module.exports.saveXread = ({ other_set = false, user, time = moment() }) => {
  return new Promise(async (resolve, reject) => {
    let SalesModel = Sales;
    let CounterModel = Counter;
    let XreadModel = Xread;
    let SalesReturnModel = SalesReturns;

    if (other_set) {
      SalesModel = SalesOtherSet;
      CounterModel = CounterOtherSet;
      XreadModel = XreadOtherSet;
      SalesReturnModel = SalesReturnsOtherSet;
    }

    const now = moment.tz(time, process.env.TIMEZONE);

    const { start_time: opening_time, end_time: closing_time } =
      await getStoreHours(now.toDate());

    /* console.log(opening_time.format("LLL"), closing_time.format("LLL")); */

    const xread = await Xread.findOne({
      transaction_date: {
        $gte: opening_time.clone().toDate(),
      },
    }).sort({
      _id: -1,
    });

    let from_date = null;
    let to_date = now.clone().toDate();
    //let to_date = closing_time.clone().toDate();

    //always xread fresh
    if (xread) {
      /**
       * HAS XREAD
       */

      from_date = moment(xread.to_datetime).toDate();
    } else {
      /**
       * HAS NO XREAD
       */
      from_date = opening_time.clone().toDate();
    }

    /**
     * check if there are sale items to process
     */
    console.log(moment(from_date).format("lll"), moment(to_date).format("lll"));

    const sales_count = await getSalesCount({
      from_date,
      to_date,
    });

    if (sales_count <= 0) {
      return reject({ msg: "Unable to Xread. No Sales Transaction" });
    }

    sales_query = [
      {
        $group: {
          _id: null,
          from_sale_id: {
            $min: "$sales_id",
          },
          to_sale_id: {
            $max: "$sales_id",
          },
          gross_amount: {
            $sum: {
              $toDecimal: "$summary.subtotal",
            },
          },
          total_returns: {
            $sum: {
              $toDecimal: "$summary.total_returns",
            },
          },
          net_of_returns: {
            $sum: {
              $toDecimal: "$summary.net_of_returns",
            },
          },
          vat_exempt: {
            $sum: {
              $toDecimal: "$summary.vat_exempt_amount",
            },
          },
          less_vat: {
            $sum: {
              $toDecimal: "$summary.less_vat",
            },
          },
          vat_sales: {
            $sum: {
              $toDecimal: "$summary.vatable_amount",
            },
          },
          vat_amount: {
            $sum: {
              $toDecimal: "$summary.vat_amount",
            },
          },
          non_vat_amount: {
            $sum: {
              $toDecimal: "$summary.non_vatable_amount",
            },
          },
          less_sc_disc: {
            $sum: {
              $toDecimal: "$summary.less_sc_disc",
            },
          },
          less_disc: {
            $sum: {
              $toDecimal: "$summary.discount_amount",
            },
          },
          net_amount: {
            $sum: {
              $toDecimal: "$summary.net_amount",
            },
          },
          credit_card_sales: {
            $sum: {
              $toDecimal: "$payments.credit_card_total",
            },
          },
          cash_sales: {
            $sum: {
              $toDecimal: "$payments.cash",
            },
          },
          credit_card_sales: {
            $sum: {
              $toDecimal: "$payments.credit_card_total",
            },
          },
          check_sales: {
            $sum: {
              $toDecimal: "$payments.checks_total",
            },
          },
          free_of_charge_sales: {
            $sum: {
              $toDecimal: "$payments.free_of_charge_payments_total",
            },
          },
          online_payment_sales: {
            $sum: {
              $toDecimal: "$payments.online_payments_total",
            },
          },
          gift_check_sales: {
            $sum: {
              $toDecimal: "$payments.gift_checks_total",
            },
          },
          charge_to_account_sales: {
            $sum: {
              $toDecimal: "$payments.charge_to_accounts_total",
            },
          },
          net_amount: {
            $sum: {
              $toDecimal: "$summary.net_amount",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ];

    async.parallel(
      {
        all_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        valid_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        voided_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: true,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        sales_returns: (cb) => {
          SalesReturnModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards.credit_card",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        free_of_charge_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.free_of_charge_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.free_of_charge_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.free_of_charge_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        online_payment_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.online_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.online_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.online_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.gift_checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.gift_checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.gift_checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        charge_to_account_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.charge_to_accounts": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.charge_to_accounts",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.charge_to_accounts",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.card",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                card: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary_per_bank: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.bank",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                bank: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },

        collection_summary: (cb) => {
          AccountCollection.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $group: {
                _id: null,
                cash: {
                  $sum: "$payments.cash",
                },
                credit_card_total: {
                  $sum: "$payments.credit_card_total",
                },
                online_payments_total: {
                  $sum: "$payments.online_payments_total",
                },
                checks_total: {
                  $sum: "$payments.checks_total",
                },
                deposit_total: {
                  $sum: "$payments.deposit_total",
                },
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
      },
      (err, result) => {
        if (err) {
          console.log(err);
        }

        CounterModel.increment("xread_id").then(async ({ next }) => {
          const date = moment.tz(moment(), process.env.TIMEZONE);

          let gross_amount = 0;
          let less_vat = 0;
          let less_sc_disc = 0;
          let less_disc = 0;
          let voided_sales = 0;
          let net_amount = 0;
          let vat_sales = 0;
          let vat_exempt = 0;
          let vat_amount = 0;
          let non_vat_amount = 0;
          let from_sales_id = 0;
          let to_sales_id = 0;
          let total_returns = 0;
          let net_of_returns = 0;
          let number_of_voided_invoices = 0;
          let credit_card_sales = 0;
          let cash_sales = 0;
          let check_sales = 0;
          let free_of_charge_sales = 0;
          let online_payment_sales = 0;
          let gift_check_sales = 0;
          let charge_to_account_sales = 0;

          let net_of_void = {
            gross_amount: 0,
            total_returns: 0,
            net_of_returns: 0,
            less_vat: 0,
            less_sc_disc: 0,
            less_disc: 0,
            net_amount: 0,
          };

          if (result.all_sales.length > 0) {
            net_of_returns = round(result.all_sales[0].net_of_returns);

            gross_amount = round(result.all_sales[0].gross_amount);
            less_vat = round(result.all_sales[0].less_vat);
            less_sc_disc = round(result.all_sales[0].less_sc_disc);
            less_disc = round(result.all_sales[0].less_disc);

            from_sales_id = result.all_sales[0].from_sale_id;
            to_sales_id = result.all_sales[0].to_sale_id;
          }

          if (result.voided_sales.length > 0) {
            voided_sales = round(result.voided_sales[0].net_amount);
            number_of_voided_invoices = result.voided_sales[0].count;
          }

          if (result.valid_sales.length > 0) {
            net_amount = round(result.valid_sales[0].net_amount);
            vat_sales = round(result.valid_sales[0].vat_sales);
            vat_exempt = round(result.valid_sales[0].vat_exempt);
            vat_amount = round(result.valid_sales[0].vat_amount);
            non_vat_amount = round(result.valid_sales[0].non_vat_amount);

            cash_sales = round(result.valid_sales[0].cash_sales);

            credit_card_sales = round(result.valid_sales[0].credit_card_sales);

            check_sales = round(result.valid_sales[0].check_sales);

            free_of_charge_sales = round(
              result.valid_sales[0].free_of_charge_sales
            );

            online_payment_sales = round(
              result.valid_sales[0].online_payment_sales
            );

            gift_check_sales = round(result.valid_sales[0].gift_check_sales);

            charge_to_account_sales = round(
              result.valid_sales[0].charge_to_account_sales
            );

            net_of_void = {
              gross_amount: round(result.valid_sales[0].gross_amount),
              total_returns: round(result.valid_sales[0].total_returns),
              net_of_returns: round(result.valid_sales[0].net_of_returns),
              less_vat: round(result.valid_sales[0].less_vat),
              less_sc_disc: round(result.valid_sales[0].less_sc_disc),
              less_disc: round(result.valid_sales[0].less_disc),
              net_amount: round(result.valid_sales[0].net_amount),
            };
          }

          total_returns = Math.abs(round(result.valid_sales[0].total_returns));

          /* if (result.sales_returns.length > 0) {
            total_returns = Math.abs(round(result.sales_returns[0].net_amount));
            net_amount += round(total_returns);
            vat_sales += round(result.sales_returns[0].vat_sales);
            vat_exempt += round(result.sales_returns[0].vat_exempt);
            vat_amount += round(result.sales_returns[0].vat_amount);
            non_vat_amount += round(result.sales_returns[0].non_vat_amount);
          } */

          /**
           * collections summary
           */

          let account_collection_summary = {
            cash: 0,
            credit_card_total: 0,
            online_payments_total: 0,
            checks_total: 0,
            deposit_total: 0,
          };

          if (result.collection_summary.length > 0) {
            account_collection_summary = result.collection_summary[0];
          }

          const trans_result = await CounterModel.increment("trans_id");
          /* console.log(
            moment(from_date).format("LLL"),
            moment(to_date).format("LLL")
          ); */
          const cash_count = await CashCount.findOne({
            date: {
              $gt: from_date,
              $lte: to_date,
            },
          }).sort({
            _id: -1,
          });

          let xread = {
            trans_id: trans_result.next,
            xread_id: next,
            user,
            transaction_date: from_date,
            from_datetime: from_date,
            to_datetime: to_date,
            date_printed: date,
            gross_amount,
            total_returns,
            net_of_returns,
            less_vat,
            less_sc_disc,
            less_disc,
            voided_sales,

            net_of_void,

            net_amount,
            vat_sales,
            vat_exempt,
            vat_amount,
            non_vat_amount,
            from_sales_id,
            to_sales_id,
            number_of_voided_invoices,
            credit_card_transactions: result.credit_card_transactions,

            check_transactions: result.check_transactions,

            free_of_charge_transactions: result.free_of_charge_transactions,

            online_payment_transactions: result.online_payment_transactions,

            gift_check_transactions: result.gift_check_transactions,

            charge_to_account_transactions:
              result.charge_to_account_transactions,

            credit_card_summary: result.credit_card_summary,

            credit_card_summary_per_bank: result.credit_card_summary_per_bank,

            credit_card_sales,
            cash_sales,
            check_sales,
            free_of_charge_sales,
            online_payment_sales,
            gift_check_sales,
            charge_to_account_sales,

            account_collection_summary,
            cash_count,
            cash_variance: round((cash_count?.total_amount || 0) - cash_sales),
          };

          const newXread = new XreadModel({
            ...xread,
          });

          newXread
            .save()
            .then((xread) => {
              resolve({
                xread: xread.toObject(),
                CounterModel,
                SalesModel,
                SalesReturnModel,
                XreadModel,
              });
            })
            .catch((err) => reject(err));
        });
      }
    );
  });
};

module.exports.updateXread = ({ other_set = false, xread }) => {
  return new Promise(async (resolve, reject) => {
    let SalesModel = Sales;
    let CounterModel = Counter;
    let XreadModel = Xread;
    let SalesReturnModel = SalesReturns;

    if (other_set) {
      SalesModel = SalesOtherSet;
      CounterModel = CounterOtherSet;
      XreadModel = XreadOtherSet;
      SalesReturnModel = SalesReturnsOtherSet;
    }

    let updated_xread = await XreadModel.findOne({ _id: xread._id });

    from_date = moment(updated_xread.from_datetime).toDate();
    to_date = moment(updated_xread.to_datetime).toDate();

    sales_query = [
      {
        $group: {
          _id: null,
          from_sale_id: {
            $min: "$sales_id",
          },
          to_sale_id: {
            $max: "$sales_id",
          },
          gross_amount: {
            $sum: {
              $toDecimal: "$summary.subtotal",
            },
          },
          total_returns: {
            $sum: {
              $toDecimal: "$summary.total_returns",
            },
          },
          net_of_returns: {
            $sum: {
              $toDecimal: "$summary.net_of_returns",
            },
          },
          vat_exempt: {
            $sum: {
              $toDecimal: "$summary.vat_exempt_amount",
            },
          },
          less_vat: {
            $sum: {
              $toDecimal: "$summary.less_vat",
            },
          },
          vat_sales: {
            $sum: {
              $toDecimal: "$summary.vatable_amount",
            },
          },
          vat_amount: {
            $sum: {
              $toDecimal: "$summary.vat_amount",
            },
          },
          non_vat_amount: {
            $sum: {
              $toDecimal: "$summary.non_vatable_amount",
            },
          },
          less_sc_disc: {
            $sum: {
              $toDecimal: "$summary.less_sc_disc",
            },
          },
          less_disc: {
            $sum: {
              $toDecimal: "$summary.discount_amount",
            },
          },
          net_amount: {
            $sum: {
              $toDecimal: "$summary.net_amount",
            },
          },
          credit_card_sales: {
            $sum: {
              $toDecimal: "$payments.credit_card_total",
            },
          },
          cash_sales: {
            $sum: {
              $toDecimal: "$payments.cash",
            },
          },
          check_sales: {
            $sum: {
              $toDecimal: "$payments.checks_total",
            },
          },
          free_of_charge_sales: {
            $sum: {
              $toDecimal: "$payments.free_of_charge_payments_total",
            },
          },
          online_payment_sales: {
            $sum: {
              $toDecimal: "$payments.online_payments_total",
            },
          },
          gift_check_sales: {
            $sum: {
              $toDecimal: "$payments.gift_checks_total",
            },
          },
          charge_to_account_sales: {
            $sum: {
              $toDecimal: "$payments.charge_to_accounts_total",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ];

    async.parallel(
      {
        all_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        valid_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        voided_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: true,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        old_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $lt: from_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        sales_returns: (cb) => {
          SalesReturns.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards.credit_card",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        free_of_charge_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.free_of_charge_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.free_of_charge_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.free_of_charge_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        online_payment_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.online_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.online_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.online_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.gift_checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.gift_checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.gift_checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        charge_to_account_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.charge_to_accounts": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.charge_to_accounts",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.charge_to_accounts",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.card",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                card: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
      },
      async (err, result) => {
        let gross_amount = 0;
        let total_returns = 0;
        let net_of_returns = 0;
        let less_vat = 0;
        let less_sc_disc = 0;
        let less_disc = 0;
        let voided_sales = 0;
        let net_amount = 0;
        let vat_sales = 0;
        let vat_exempt = 0;
        let vat_amount = 0;
        let non_vat_amount = 0;

        let from_sales_id = 0;
        let to_sales_id = 0;
        let number_of_voided_invoices = 0;
        let old_grand_total_sales = 0;
        let new_grand_total_sales = 0;
        let credit_card_sales = 0;
        let cash_sales = 0;
        let check_sales = 0;
        let free_of_charge_sales = 0;
        let online_payment_sales = 0;
        let gift_check_sales = 0;
        let charge_to_account_sales = 0;

        let net_of_void = {
          gross_amount: 0,
          total_returns: 0,
          net_of_returns: 0,
          less_vat: 0,
          less_sc_disc: 0,
          less_disc: 0,
          net_amount: 0,
        };

        if (result.all_sales.length > 0) {
          gross_amount = round(result.all_sales[0].gross_amount);
          total_returns = round(result.all_sales[0].total_returns);
          net_of_returns = round(result.all_sales[0].net_of_returns);
          less_vat = round(result.all_sales[0].less_vat);
          less_sc_disc = round(result.all_sales[0].less_sc_disc);
          less_disc = round(result.all_sales[0].less_disc);

          from_sales_id = result.all_sales[0].from_sale_id;
          to_sales_id = result.all_sales[0].to_sale_id;
        }

        if (result.voided_sales.length > 0) {
          voided_sales = round(result.voided_sales[0].net_amount);
          number_of_voided_invoices = result.voided_sales[0].count;
        }

        if (result.valid_sales.length > 0) {
          net_amount = round(result.valid_sales[0].net_amount);
          vat_sales = round(result.valid_sales[0].vat_sales);
          vat_exempt = round(result.valid_sales[0].vat_exempt);
          vat_amount = round(result.valid_sales[0].vat_amount);
          non_vat_amount = round(result.valid_sales[0].non_vat_amount);

          cash_sales = round(result.valid_sales[0].cash_sales);
          credit_card_sales = round(result.valid_sales[0].credit_card_sales);

          check_sales = round(result.valid_sales[0].check_sales);

          free_of_charge_sales = round(
            result.valid_sales[0].free_of_charge_sales
          );

          online_payment_sales = round(
            result.valid_sales[0].online_payment_sales
          );

          gift_check_sales = round(result.valid_sales[0].gift_check_sales);

          charge_to_account_sales = round(
            result.valid_sales[0].charge_to_account_sales
          );

          net_of_void = {
            gross_amount: round(result.valid_sales[0].gross_amount),
            total_returns: round(result.valid_sales[0].total_returns),
            net_of_returns: round(result.valid_sales[0].net_of_returns),
            less_vat: round(result.valid_sales[0].less_vat),
            less_sc_disc: round(result.valid_sales[0].less_sc_disc),
            less_disc: round(result.valid_sales[0].less_disc),
            net_amount: round(result.valid_sales[0].net_amount),
          };
        }

        if (result.old_sales.length > 0) {
          old_grand_total_sales = round(result.old_sales[0].net_amount);
          new_grand_total_sales = round(old_grand_total_sales + net_amount);
        } else {
          new_grand_total_sales = round(old_grand_total_sales + net_amount);
        }

        if (result.sales_returns.length > 0) {
          total_returns = Math.abs(round(result.sales_returns[0].net_amount));
          net_amount += round(total_returns);
          vat_sales += round(result.sales_returns[0].vat_sales);
          vat_exempt += round(result.sales_returns[0].vat_exempt);
          vat_amount += round(result.sales_returns[0].vat_amount);
          // non_vat_amount += round(result.sales_returns[0].non_vat_amount);
        }

        updated_xread.set({
          gross_amount,
          total_returns,
          net_of_returns,
          less_vat,
          less_sc_disc,
          less_disc,
          voided_sales,

          net_of_void,

          net_amount,
          vat_sales,
          vat_exempt,
          vat_amount,
          non_vat_amount,
          from_sales_id,
          to_sales_id,
          number_of_voided_invoices,
          old_grand_total_sales,
          new_grand_total_sales,
          credit_card_transactions: result.credit_card_transactions,

          check_transactions: result.check_transactions,

          free_of_charge_transactions: result.free_of_charge_transactions,

          online_payment_transactions: result.online_payment_transactions,

          gift_check_transactions: result.gift_check_transactions,

          charge_to_account_transactions: result.charge_to_account_transactions,

          credit_card_summary: result.credit_card_summary,
          credit_card_sales,
          cash_sales,
          check_sales,
          free_of_charge_sales,
          online_payment_sales,
          gift_check_sales,
          charge_to_account_sales,
        });

        updated_xread
          .save()
          .then((record) => {
            resolve({ xread: record.toObject() });
          })
          .catch((err) => reject(err));
      }
    );
  });
};

module.exports.updateZread = ({ other_set = false, zread }) => {
  return new Promise(async (resolve, reject) => {
    let SalesModel = Sales;
    let CounterModel = Counter;
    let ZreadModel = Zread;
    let SalesReturnModel = SalesReturns;

    if (other_set) {
      SalesModel = SalesOtherSet;
      CounterModel = CounterOtherSet;
      ZreadModel = ZreadOtherSet;
      SalesReturnModel = SalesReturnsOtherSet;
    }

    let updated_zread = await ZreadModel.findOne({ _id: zread._id });

    from_date = moment(updated_zread.from_datetime).toDate();
    to_date = moment(updated_zread.to_datetime).toDate();

    sales_query = [
      {
        $group: {
          _id: null,
          from_sale_id: {
            $min: "$sales_id",
          },
          to_sale_id: {
            $max: "$sales_id",
          },
          gross_amount: {
            $sum: {
              $toDecimal: "$summary.subtotal",
            },
          },
          total_returns: {
            $sum: {
              $toDecimal: "$summary.total_returns",
            },
          },
          net_of_returns: {
            $sum: {
              $toDecimal: "$summary.net_of_returns",
            },
          },
          vat_exempt: {
            $sum: {
              $toDecimal: "$summary.vat_exempt_amount",
            },
          },
          less_vat: {
            $sum: {
              $toDecimal: "$summary.less_vat",
            },
          },
          vat_sales: {
            $sum: {
              $toDecimal: "$summary.vatable_amount",
            },
          },
          vat_amount: {
            $sum: {
              $toDecimal: "$summary.vat_amount",
            },
          },
          non_vat_amount: {
            $sum: {
              $toDecimal: "$summary.non_vatable_amount",
            },
          },
          less_sc_disc: {
            $sum: {
              $toDecimal: "$summary.less_sc_disc",
            },
          },
          less_disc: {
            $sum: {
              $toDecimal: "$summary.discount_amount",
            },
          },
          net_amount: {
            $sum: {
              $toDecimal: "$summary.net_amount",
            },
          },
          credit_card_sales: {
            $sum: {
              $toDecimal: "$payments.credit_card_total",
            },
          },
          cash_sales: {
            $sum: {
              $toDecimal: "$payments.cash",
            },
          },
          check_sales: {
            $sum: {
              $toDecimal: "$payments.checks_total",
            },
          },
          free_of_charge_sales: {
            $sum: {
              $toDecimal: "$payments.free_of_charge_payments_total",
            },
          },
          online_payment_sales: {
            $sum: {
              $toDecimal: "$payments.online_payments_total",
            },
          },
          gift_check_sales: {
            $sum: {
              $toDecimal: "$payments.gift_checks_total",
            },
          },
          charge_to_account_sales: {
            $sum: {
              $toDecimal: "$payments.charge_to_accounts_total",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ];

    async.parallel(
      {
        all_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        valid_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        voided_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: true,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        old_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $lt: from_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        sales_returns: (cb) => {
          SalesReturns.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards.credit_card",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        free_of_charge_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.free_of_charge_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.free_of_charge_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.free_of_charge_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        online_payment_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.online_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.online_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.online_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.gift_checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.gift_checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.gift_checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        charge_to_account_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.charge_to_accounts": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.charge_to_accounts",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.charge_to_accounts",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.card",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                card: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
      },
      async (err, result) => {
        let gross_amount = 0;
        let total_returns = 0;
        let net_of_returns = 0;
        let less_vat = 0;
        let less_sc_disc = 0;
        let less_disc = 0;
        let voided_sales = 0;
        let net_amount = 0;
        let vat_sales = 0;
        let vat_exempt = 0;
        let vat_amount = 0;
        let non_vat_amount = 0;

        let from_sales_id = 0;
        let to_sales_id = 0;
        let number_of_voided_invoices = 0;
        let old_grand_total_sales = 0;
        let new_grand_total_sales = 0;
        let credit_card_sales = 0;
        let cash_sales = 0;
        let check_sales = 0;
        let free_of_charge_sales = 0;
        let online_payment_sales = 0;
        let gift_check_sales = 0;
        let charge_to_account_sales = 0;

        let net_of_void = {
          gross_amount: 0,
          total_returns: 0,
          net_of_returns: 0,
          less_vat: 0,
          less_sc_disc: 0,
          less_disc: 0,
          net_amount: 0,
        };

        if (result.all_sales.length > 0) {
          gross_amount = round(result.all_sales[0].gross_amount);
          total_returns = round(result.all_sales[0].total_returns);
          net_of_returns = round(result.all_sales[0].net_of_returns);
          less_vat = round(result.all_sales[0].less_vat);
          less_sc_disc = round(result.all_sales[0].less_sc_disc);
          less_disc = round(result.all_sales[0].less_disc);

          from_sales_id = result.all_sales[0].from_sale_id;
          to_sales_id = result.all_sales[0].to_sale_id;
        }

        if (result.voided_sales.length > 0) {
          voided_sales = round(result.voided_sales[0].net_amount);
          number_of_voided_invoices = result.voided_sales[0].count;
        }

        if (result.valid_sales.length > 0) {
          net_amount = round(result.valid_sales[0].net_amount);
          vat_sales = round(result.valid_sales[0].vat_sales);
          vat_exempt = round(result.valid_sales[0].vat_exempt);
          vat_amount = round(result.valid_sales[0].vat_amount);
          non_vat_amount = round(result.valid_sales[0].non_vat_amount);

          cash_sales = round(result.valid_sales[0].cash_sales);
          credit_card_sales = round(result.valid_sales[0].credit_card_sales);

          check_sales = round(result.valid_sales[0].check_sales);

          free_of_charge_sales = round(
            result.valid_sales[0].free_of_charge_sales
          );

          online_payment_sales = round(
            result.valid_sales[0].online_payment_sales
          );

          gift_check_sales = round(result.valid_sales[0].gift_check_sales);

          charge_to_account_sales = round(
            result.valid_sales[0].charge_to_account_sales
          );

          net_of_void = {
            gross_amount: round(result.valid_sales[0].gross_amount),
            total_returns: round(result.valid_sales[0].total_returns),
            net_of_returns: round(result.valid_sales[0].net_of_returns),
            less_vat: round(result.valid_sales[0].less_vat),
            less_sc_disc: round(result.valid_sales[0].less_sc_disc),
            less_disc: round(result.valid_sales[0].less_disc),
            net_amount: round(result.valid_sales[0].net_amount),
          };
        }

        if (result.old_sales.length > 0) {
          old_grand_total_sales = round(result.old_sales[0].net_amount);
          new_grand_total_sales = round(old_grand_total_sales + net_amount);
        } else {
          new_grand_total_sales = round(old_grand_total_sales + net_amount);
        }

        if (result.sales_returns.length > 0) {
          total_returns = Math.abs(round(result.sales_returns[0].net_amount));
          net_amount += round(total_returns);
          vat_sales += round(result.sales_returns[0].vat_sales);
          vat_exempt += round(result.sales_returns[0].vat_exempt);
          vat_amount += round(result.sales_returns[0].vat_amount);
          // non_vat_amount += round(result.sales_returns[0].non_vat_amount);
        }

        updated_zread.set({
          gross_amount,
          total_returns,
          net_of_returns,
          less_vat,
          less_sc_disc,
          less_disc,
          voided_sales,

          net_of_void,

          net_amount,
          vat_sales,
          vat_exempt,
          vat_amount,
          non_vat_amount,
          from_sales_id,
          to_sales_id,
          number_of_voided_invoices,
          old_grand_total_sales,
          new_grand_total_sales,
          credit_card_transactions: result.credit_card_transactions,

          check_transactions: result.check_transactions,

          free_of_charge_transactions: result.free_of_charge_transactions,

          online_payment_transactions: result.online_payment_transactions,

          gift_check_transactions: result.gift_check_transactions,

          charge_to_account_transactions: result.charge_to_account_transactions,

          credit_card_summary: result.credit_card_summary,
          credit_card_sales,
          cash_sales,
          check_sales,
          free_of_charge_sales,
          online_payment_sales,
          gift_check_sales,
          charge_to_account_sales,
        });

        updated_zread
          .save()
          .then((record) => {
            resolve({ zread: record.toObject() });
          })
          .catch((err) => reject(err));
      }
    );
  });
};

module.exports.saveZread = ({
  other_set = false,
  user,
  time = moment(),
  is_update = false,
}) => {
  return new Promise(async (resolve, reject) => {
    let SalesModel = Sales;
    let CounterModel = Counter;
    let ZreadModel = Zread;
    let SalesReturnModel = SalesReturns;

    if (other_set) {
      SalesModel = SalesOtherSet;
      CounterModel = CounterOtherSet;
      ZreadModel = ZreadOtherSet;
      SalesReturnModel = SalesReturnsOtherSet;
    }

    const now = moment.tz(time, process.env.TIMEZONE);
    const closing_time_result = await AccountSetting.findOne({
      key: constants.CLOSING_TIME,
    });

    const closing_time = closing_time_result.value;

    const opening_time_result = await AccountSetting.findOne({
      key: constants.OPENING_TIME,
    });

    const opening_time = opening_time_result.value;

    /**
     * check if after opening time and before the end of day
     */

    const open_time = moment(
      `${now.clone().format("YYYY-MM-DD")} ${moment(opening_time).format(
        "HH:mm"
      )}`
    );

    const close_time = moment(
      `${now.clone().add({ day: 1 }).format("YYYY-MM-DD")} ${moment(
        closing_time
      ).format("HH:mm")}`
    );

    let from_date = null;
    let to_date = null;

    if (now.clone().hours() >= open_time.hours() && now.clone().hours() <= 23) {
      /**
       * closed with in the same day (early closing)
       */
      from_date = open_time.clone();
      to_date = now.clone().endOf("day");
    } else {
      /**
       * next day closing
       */

      from_date = open_time.clone().subtract({ day: 1 });
      to_date = close_time.clone().subtract({ day: 1 });
    }

    /* console.log(from_date.format("LLLL"));
  console.log(to_date.format("LLLL")); */

    from_date = from_date.toDate();
    to_date = to_date.toDate();

    sales_query = [
      {
        $group: {
          _id: null,
          from_sale_id: {
            $min: "$sales_id",
          },
          to_sale_id: {
            $max: "$sales_id",
          },
          gross_amount: {
            $sum: {
              $toDecimal: "$summary.subtotal",
            },
          },
          total_returns: {
            $sum: {
              $toDecimal: "$summary.total_returns",
            },
          },
          net_of_returns: {
            $sum: {
              $toDecimal: "$summary.net_of_returns",
            },
          },
          vat_exempt: {
            $sum: {
              $toDecimal: "$summary.vat_exempt_amount",
            },
          },
          less_vat: {
            $sum: {
              $toDecimal: "$summary.less_vat",
            },
          },
          vat_sales: {
            $sum: {
              $toDecimal: "$summary.vatable_amount",
            },
          },
          vat_amount: {
            $sum: {
              $toDecimal: "$summary.vat_amount",
            },
          },
          non_vat_amount: {
            $sum: {
              $toDecimal: "$summary.non_vatable_amount",
            },
          },
          less_sc_disc: {
            $sum: {
              $toDecimal: "$summary.less_sc_disc",
            },
          },
          less_disc: {
            $sum: {
              $toDecimal: "$summary.discount_amount",
            },
          },
          net_amount: {
            $sum: {
              $toDecimal: "$summary.net_amount",
            },
          },
          credit_card_sales: {
            $sum: {
              $toDecimal: "$payments.credit_card_total",
            },
          },
          cash_sales: {
            $sum: {
              $toDecimal: "$payments.cash",
            },
          },
          check_sales: {
            $sum: {
              $toDecimal: "$payments.checks_total",
            },
          },
          free_of_charge_sales: {
            $sum: {
              $toDecimal: "$payments.free_of_charge_payments_total",
            },
          },
          online_payment_sales: {
            $sum: {
              $toDecimal: "$payments.online_payments_total",
            },
          },
          gift_check_sales: {
            $sum: {
              $toDecimal: "$payments.gift_checks_total",
            },
          },
          charge_to_account_sales: {
            $sum: {
              $toDecimal: "$payments.charge_to_accounts_total",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ];

    async.parallel(
      {
        all_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        valid_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        voided_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: true,
                },
                datetime: {
                  $gte: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        old_sales: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $lt: from_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        sales_returns: (cb) => {
          SalesReturns.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            ...sales_query,
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards.credit_card",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        free_of_charge_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.free_of_charge_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.free_of_charge_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.free_of_charge_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        online_payment_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.online_payments": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.online_payments",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.online_payments",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.gift_checks": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.gift_checks",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.gift_checks",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_collections: (cb) => {
          GiftCheck.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            {
              $sort: {
                date: 1,
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gift_check_collection_payment_types: (cb) => {
          GiftCheck.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            {
              $group: {
                _id: "$payment_type",
                payment_type: {
                  $first: "$payment_type",
                },
                amount: {
                  $sum: "$amount",
                },
              },
            },
            {
              $sort: {
                payment_type: 1,
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        charge_to_account_transactions: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.charge_to_accounts": {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.charge_to_accounts",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                transaction: "$payments.charge_to_accounts",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.card",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                card: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        credit_card_summary_per_bank: (cb) => {
          SalesModel.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
                "payments.credit_cards.0": {
                  $exists: true,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $unwind: {
                path: "$payments.credit_cards",
              },
            },
            {
              $project: {
                sales_id: 1,
                datetime: 1,
                credit_card: "$payments.credit_cards",
              },
            },
            {
              $group: {
                _id: "$credit_card.credit_card.bank",
                amount: {
                  $sum: "$credit_card.credit_card.amount",
                },
              },
            },
            {
              $project: {
                _id: 0,
                bank: "$_id",
                amount: "$amount",
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        collection_summary: (cb) => {
          AccountCollection.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                datetime: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            {
              $sort: {
                datetime: 1,
              },
            },
            {
              $group: {
                _id: null,
                cash: {
                  $sum: "$payments.cash",
                },
                credit_card_total: {
                  $sum: "$payments.credit_card_total",
                },
                online_payments_total: {
                  $sum: "$payments.online_payments_total",
                },
                checks_total: {
                  $sum: "$payments.checks_total",
                },
                deposit_total: {
                  $sum: "$payments.deposit_total",
                },
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
        gc_collections: (cb) => {
          GiftCheck.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $gt: from_date,
                  $lte: to_date,
                },
              },
            },
            {
              $sort: {
                date: 1,
              },
            },
            {
              $group: {
                _id: null,
                cash: {
                  $sum: "$payments.cash",
                },
                credit_card_total: {
                  $sum: "$payments.credit_card_total",
                },
              },
            },
          ])
            .allowDiskUse(true)
            .exec(cb);
        },
      },
      (err, result) => {
        CounterModel.increment("zread_id").then(async ({ next }) => {
          const date = moment.tz(moment(), process.env.TIMEZONE);

          const cash_count = await CashCount.findOne({
            date: {
              $gt: from_date,
              $lte: to_date,
            },
          }).sort({
            _id: -1,
          });

          let gross_amount = 0;
          let total_returns = 0;
          let net_of_returns = 0;
          let less_vat = 0;
          let less_sc_disc = 0;
          let less_disc = 0;
          let voided_sales = 0;
          let net_amount = 0;
          let vat_sales = 0;
          let vat_exempt = 0;
          let vat_amount = 0;
          let non_vat_amount = 0;

          let from_sales_id = 0;
          let to_sales_id = 0;
          let number_of_voided_invoices = 0;
          let old_grand_total_sales = 0;
          let new_grand_total_sales = 0;
          let credit_card_sales = 0;
          let cash_sales = 0;
          let check_sales = 0;
          let free_of_charge_sales = 0;
          let online_payment_sales = 0;
          let gift_check_sales = 0;
          let charge_to_account_sales = 0;

          let net_of_void = {
            gross_amount: 0,
            total_returns: 0,
            net_of_returns: 0,
            less_vat: 0,
            less_sc_disc: 0,
            less_disc: 0,
            net_amount: 0,
          };

          if (result.all_sales.length > 0) {
            gross_amount = round(result.all_sales[0].gross_amount);
            total_returns = round(result.all_sales[0].total_returns);
            net_of_returns = round(result.all_sales[0].net_of_returns);
            less_vat = round(result.all_sales[0].less_vat);
            less_sc_disc = round(result.all_sales[0].less_sc_disc);
            less_disc = round(result.all_sales[0].less_disc);

            from_sales_id = result.all_sales[0].from_sale_id;
            to_sales_id = result.all_sales[0].to_sale_id;
          }

          if (result.voided_sales.length > 0) {
            voided_sales = round(result.voided_sales[0].net_amount);
            number_of_voided_invoices = result.voided_sales[0].count;
          }

          if (result.valid_sales.length > 0) {
            net_amount = round(result.valid_sales[0].net_amount);
            vat_sales = round(result.valid_sales[0].vat_sales);
            vat_exempt = round(result.valid_sales[0].vat_exempt);
            vat_amount = round(result.valid_sales[0].vat_amount);
            non_vat_amount = round(result.valid_sales[0].non_vat_amount);

            cash_sales = round(result.valid_sales[0].cash_sales);
            credit_card_sales = round(result.valid_sales[0].credit_card_sales);

            check_sales = round(result.valid_sales[0].check_sales);

            free_of_charge_sales = round(
              result.valid_sales[0].free_of_charge_sales
            );

            online_payment_sales = round(
              result.valid_sales[0].online_payment_sales
            );

            gift_check_sales = round(result.valid_sales[0].gift_check_sales);

            charge_to_account_sales = round(
              result.valid_sales[0].charge_to_account_sales
            );

            net_of_void = {
              gross_amount: round(result.valid_sales[0].gross_amount),
              total_returns: round(result.valid_sales[0].total_returns),
              net_of_returns: round(result.valid_sales[0].net_of_returns),
              less_vat: round(result.valid_sales[0].less_vat),
              less_sc_disc: round(result.valid_sales[0].less_sc_disc),
              less_disc: round(result.valid_sales[0].less_disc),
              net_amount: round(result.valid_sales[0].net_amount),
            };
          }

          if (result.old_sales.length > 0) {
            old_grand_total_sales = round(result.old_sales[0].net_amount);
            new_grand_total_sales = round(old_grand_total_sales + net_amount);
          } else {
            new_grand_total_sales = round(old_grand_total_sales + net_amount);
          }

          total_returns = Math.abs(round(result.valid_sales[0].total_returns));

          /* if (result.sales_returns.length > 0) {
            total_returns = Math.abs(round(result.sales_returns[0].net_amount));
            net_amount += round(total_returns);
            vat_sales += round(result.sales_returns[0].vat_sales);
            vat_exempt += round(result.sales_returns[0].vat_exempt);
            vat_amount += round(result.sales_returns[0].vat_amount);
            // non_vat_amount += round(result.sales_returns[0].non_vat_amount);
          } */

          /**
           * collections summary
           */

          let account_collection_summary = {
            cash: 0,
            credit_card_total: 0,
            online_payments_total: 0,
            checks_total: 0,
            deposit_total: 0,
          };

          if (result.collection_summary.length > 0) {
            account_collection_summary = result.collection_summary[0];
          }

          /**
           * do no save when gross amount is 0
           */

          if (gross_amount <= 0) {
            resolve({ zread: null });
            return;
          }

          let trans_result = null;

          if (!is_update) {
            trans_result = await CounterModel.increment("trans_id");
          }

          const current_branch = await getStoreWarehouse();

          let gift_check_cash =
            (result?.gift_check_collection_payment_types || []).find(
              (o) => o.payment_type === PAYMENT_TYPE_CASH
            )?.amount || 0;

          let gift_check_credit_card =
            (result?.gift_check_collection_payment_types || []).find(
              (o) => o.payment_type === PAYMENT_TYPE_CREDIT_CARD
            )?.amount || 0;

          let gift_check_adjustments =
            (result?.gift_check_collection_payment_types || []).find(
              (o) => o.payment_type === PAYMENT_TYPE_ADJUSTMENTS
            )?.amount || 0;

          let zread = {
            ...(!is_update && {
              warehouse: current_branch,
              trans_id: trans_result.next,
              zread_id: next,
              user: user,
              transaction_date: date,
              date_printed: date,
              from_datetime: from_date,
              to_datetime: to_date,
            }),

            gross_amount,
            total_returns,
            net_of_returns,
            less_vat,
            less_sc_disc,
            less_disc,
            voided_sales,

            net_of_void,

            net_amount,
            vat_sales,
            vat_exempt,
            vat_amount,
            non_vat_amount,
            from_sales_id,
            to_sales_id,
            number_of_voided_invoices,
            old_grand_total_sales,
            new_grand_total_sales,
            credit_card_transactions: result.credit_card_transactions,

            check_transactions: result.check_transactions,

            free_of_charge_transactions: result.free_of_charge_transactions,

            online_payment_transactions: result.online_payment_transactions,

            gift_check_transactions: result.gift_check_transactions,

            gift_check_collections: result.gift_check_collections,

            gift_check_collection_payment_types:
              result.gift_check_collection_payment_types,

            gift_check_cash,
            gift_check_credit_card,
            gift_check_adjustments,

            charge_to_account_transactions:
              result.charge_to_account_transactions,

            credit_card_summary: result.credit_card_summary,

            credit_card_summary_per_bank: result.credit_card_summary_per_bank,

            credit_card_sales,
            cash_sales,
            check_sales,
            free_of_charge_sales,
            online_payment_sales,
            gift_check_sales,
            charge_to_account_sales,

            account_collection_summary,

            cash_count,
            cash_variance: round(
              (cash_count?.total_amount || 0) - cash_sales - gift_check_cash
            ),
          };

          if (!is_update) {
            newZread = new ZreadModel({
              ...zread,
            });
          } else {
            newZread = await ZreadModel.findOne({
              from_datetime: from_date,
              to_datetime: to_date,
            });

            if (isEmpty(newZread)) {
              return reject({ msg: "No Zread Found" });
            }

            newZread.set({
              ...zread,
            });

            newZread.synced = undefined;
          }

          newZread
            .save()
            .then((zread) => {
              resolve({ zread: zread.toObject() });
            })
            .catch((err) => reject(err));
        });
      }
    );
  });
};

module.exports.getDaysFromDateRange = ({ period_covered }) => {
  return new Promise(async (resolve, reject) => {
    let dates = [];
    const date = moment(period_covered[0]);
    const to_date = moment(period_covered[1]).endOf("day");

    while (date.isBefore(to_date)) {
      const { from_datetime, to_datetime } = await getPeriodFromRequest({
        from_date: date.clone().startOf("day"),
        to_date: date.clone().endOf("day"),
      });

      dates = [...dates, [from_datetime, to_datetime]];
      date.add({ day: 1 });
    }

    resolve(dates);
  });
};

module.exports.getLatestZreadOfTheDay = (date) => {
  return new Promise((resolve, reject) => {
    Zread.findOne({
      from_datetime: {
        $gte: moment(date).startOf("day").toDate(),
        $lte: moment(date).endOf("day").toDate(),
      },
      deleted: {
        $exists: false,
      },
    })
      .sort({
        _id: -1,
      })
      .then((record) => resolve(record))
      .catch((err) => reject(err));
  });
};

module.exports.getZreadFromDate = (date) => {
  return new Promise((resolve, reject) => {
    Zread.findOne({
      deleted: {
        $exists: false,
      },
      from_datetime: {
        $gte: moment(date).startOf("day").toDate(),
        $lte: moment(date).endOf("day").toDate(),
      },
    })
      .lean(true)
      .then((record) => resolve(record))
      .catch((err) => reject(err));
  });
};
