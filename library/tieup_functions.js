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
const Product = require("../models/Product");

const {
  MARKUP_OPTION_PERCENT_ADD_ON,
  MARKUP_OPTION_ADD_ON_VALUE,
} = require("./../config/constants");
const isEmpty = require("../validators/is-empty");
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const union = require("lodash").union;
const sortBy = require("lodash").sortBy;

module.exports.updateItemTieupPrice = ({ tieup }) => {
  Product.find().then((products) => {
    (products || []).forEach((product) => {
      const tieup_index = (product.tieup_prices || []).findIndex((o) => {
        if ((o.tieup && isEmpty(o.tieup._id)) || isEmpty(tieup)) {
          return false;
        }

        return o.tieup._id.toString() === tieup._id.toString();
      });

      let new_price;

      if (
        tieup.markup_option === MARKUP_OPTION_ADD_ON_VALUE &&
        !isEmpty(tieup.markup)
      ) {
        new_price = round(product.price + tieup.markup);
      } else if (
        tieup.markup_option === MARKUP_OPTION_PERCENT_ADD_ON &&
        !isEmpty(tieup.markup)
      ) {
        new_price = round(product.price + (product.price * tieup.markup) / 100);
      }

      if (tieup_index < 0) {
        //tieup not found
        Product.updateOne(
          {
            _id: product._id,
          },
          {
            $push: {
              tieup_prices: {
                tieup,
                price: new_price,
              },
            },
          }
        ).exec();
      } else {
        //tieup found

        const tieup_prices = [...product.tieup_prices];
        tieup_prices[tieup_index] = {
          tieup,
          price: new_price,
        };

        Product.updateOne(
          {
            _id: product._id,
          },
          {
            $set: {
              tieup_prices,
            },
          }
        ).exec();
      }
    });
  });
};
