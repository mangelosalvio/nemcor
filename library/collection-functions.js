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
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const union = require("lodash").union;
const sortBy = require("lodash").sortBy;

module.exports.updateChargeToAccountBalance = ({
  charge_to_account_id,
  SalesModel,
  payment_amount,
}) => {
  SalesModel.findOne({
    "payments.charge_to_accounts._id": charge_to_account_id,
  }).then((sale) => {
    if (sale) {
      let charge_to_accounts = [...sale.payments.charge_to_accounts.toObject()];

      let charge_to_account_index = charge_to_accounts.findIndex(
        (o) => o._id.toString() === charge_to_account_id.toString()
      );

      if (charge_to_account_index >= 0) {
        let charge = charge_to_accounts[charge_to_account_index];

        let balance = charge.balance || charge.amount;

        balance = round(balance - payment_amount);

        charge_to_accounts[charge_to_account_index] = {
          ...charge_to_accounts[charge_to_account_index],
          balance,
        };

        try {
          SalesModel.updateOne(
            {
              "payments.charge_to_accounts._id": charge_to_account_id,
            },
            {
              $set: {
                "payments.charge_to_accounts": charge_to_accounts,
              },
            }
          ).exec();
        } catch (err) {
          console.log(err);
        }
      }
    }
  });
};
