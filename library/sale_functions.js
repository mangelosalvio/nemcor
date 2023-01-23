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
