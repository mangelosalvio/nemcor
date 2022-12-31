const {
  SETTING_MAIN_WAREHOUSE,
  SETTING_STORE,
  SETTING_RECEIPT_FOOTER,
} = require("../config/constants");
const AccountSetting = require("../models/AccountSetting");

module.exports.getSettingValueFromKey = (key) => {
  return new Promise((resolve, reject) => {
    AccountSetting.findOne({
      key,
    })
      .then((record) => {
        if (record) {
          return resolve(record.value);
        }
        return resolve(null);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getBodegaWarehouse = (key) => {
  return new Promise((resolve, reject) => {
    AccountSetting.findOne({
      key: SETTING_MAIN_WAREHOUSE,
    })
      .then((record) => {
        if (record) {
          return resolve(record.value);
        }
        return resolve(null);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getStoreWarehouse = (key) => {
  return new Promise((resolve, reject) => {
    AccountSetting.findOne({
      key: SETTING_STORE,
    })
      .then((record) => {
        if (record) {
          return resolve(record.value);
        }
        return resolve(null);
      })
      .catch((err) => reject(err));
  });
};

module.exports.getReceiptFooter = (key) => {
  return new Promise((resolve, reject) => {
    AccountSetting.findOne({
      key: SETTING_RECEIPT_FOOTER,
    })
      .then((record) => {
        if (record) {
          return resolve(record.value);
        }
        return resolve(null);
      })
      .catch((err) => reject(err));
  });
};
