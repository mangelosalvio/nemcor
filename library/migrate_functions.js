const mongoose = require("mongoose");
const axios = require("axios");
const db = require("./../config/keys").mongoURI;
const async = require("async");
const isEmpty = require("./../validators/is-empty");
const moment = require("moment");

const sqldatabase = require("../sql-import/sqldatabase");
const { QueryTypes } = require("sequelize");

const ObjectId = mongoose.Types.ObjectId;

module.exports.toDate = (strDate) => {
  // console.log(strDate);
  const _date =
    !isEmpty(strDate) && strDate.length === 10 && strDate !== "0000-00-00"
      ? moment(strDate.toString().trim(), "YYYY-MM-DD")
      : null;

  if (_date?.isValid()) {
    return _date;
  } else {
    return null;
  }
};

module.exports.getFirstRow = (sql) => {
  return new Promise(async (resolve, reject) => {
    let records = await sqldatabase
      .query(sql, {
        type: QueryTypes.SELECT,
      })
      .catch((err) => {
        return reject(err);
      });

    return resolve(records?.[0] || null);
  });
};

module.exports.getListFromQuery = (sql) => {
  return new Promise(async (resolve, reject) => {
    let records = await sqldatabase
      .query(sql, {
        type: QueryTypes.SELECT,
      })
      .catch((err) => {
        return reject(err);
      });

    return resolve(records);
  });
};
