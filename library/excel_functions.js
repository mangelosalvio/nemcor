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
const Excel = require("exceljs");

const {
  MARKUP_OPTION_PERCENT_ADD_ON,
  MARKUP_OPTION_ADD_ON_VALUE,
} = require("./../config/constants");
const isEmpty = require("../validators/is-empty");
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const union = require("lodash").union;
const sortBy = require("lodash").sortBy;

const top_border_style = {
  top: { style: "thin" },
};

module.exports.generateExcelAllSalesListings = ({ records, res }) => {
  return new Promise(async (resolve, reject) => {
    let report_title = "All Sales Listings";
    const column_props = [
      {
        header: "DATE/TIME",
        key: "datetime",
        width: 30,
        style: {
          alignment: {
            horizontal: "center",
          },
        },
      },
      {
        header: "OS#",
        key: "sales_id",
        width: 20,
        style: {
          alignment: {
            horizontal: "left",
          },
        },
      },
      {
        header: "TRANS#",
        key: "trans_id",
        width: 10,
        style: {
          alignment: {
            horizontal: "center",
          },
        },
      },
      {
        header: "GROSS AMOUNT",
        key: "net_of_returns",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "LESS VAT SC/PWD",
        key: "less_vat",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "LESS SC DISC",
        key: "less_sc_disc",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "LESS DISCOUNT",
        key: "discount_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "VAT EXCEMPT",
        key: "vat_exempt_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "VAT SALES",
        key: "vatable_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "VAT AMOUNT",
        key: "vat_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "NOT VAT",
        key: "non_vatable_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "ZERO RATED",
        key: "zero_rated_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "NET AMOUNT DUE",
        key: "net_amount",
        width: 20,
        style: {
          alignment: {
            horizontal: "right",
          },
          numFmt: "#,##0.00",
        },
      },
      {
        header: "STATUS",
        key: "deleted",
        width: 20,
        style: {
          alignment: {
            horizontal: "center",
          },
        },
      },
    ];

    let filename = `all-sales-listings-${moment().format("YYYYMMDD")}.xlsx`;

    let wb = new Excel.Workbook();
    let ws = wb.addWorksheet("Report", {
      pageSetup: {
        orientation: "portrait",
        scale: 100,
      },
    });

    ws.mergeCells(ws.rowCount, 1, ws.rowCount, column_props.length);
    ws.lastRow.getCell(1).value = process.env.trade_name;
    ws.lastRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.lastRow.getCell(1).font = {
      bold: true,
    };
    ws.addRow().commit();

    ws.mergeCells(ws.rowCount, 1, ws.rowCount, column_props.length);
    ws.lastRow.getCell(1).value = report_title;
    ws.lastRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    ws.lastRow.getCell(1).font = {
      bold: true,
    };
    ws.addRow().commit();
    column_props.forEach((column, index) => {
      ws.lastRow.getCell(index + 1).value = column.header;
    });

    ws.columns = [...column_props];

    let items = (records || []).map((o) => {
      return {
        ...o.toObject(),
        ...o.summary,
        deleted: isEmpty(o.deleted) ? "VOIDED" : "",
        datetime: moment(o.datetime).format("MM/DD/YYYY hh:mm A"),
      };
    });

    items.forEach((item) => {
      ws.addRow(item).commit();
    });

    ws.addRow({
      net_of_returns: sumBy(items, (o) => numeral(o.net_of_returns).value()),
      less_vat: sumBy(items, (o) => numeral(o.less_vat).value()),
      less_sc_disc: sumBy(items, (o) => numeral(o.less_sc_disc).value()),
      discount_amount: sumBy(items, (o) => numeral(o.discount_amount).value()),
      vat_exempt_amount: sumBy(items, (o) =>
        numeral(o.vat_exempt_amount).value()
      ),
      vatable_amount: sumBy(items, (o) => numeral(o.vatable_amount).value()),
      vat_amount: sumBy(items, (o) => numeral(o.vat_amount).value()),
      vat_amount: sumBy(items, (o) => numeral(o.vat_amount).value()),
      non_vatable_amount: sumBy(items, (o) =>
        numeral(o.non_vatable_amount).value()
      ),
      zero_rated_amount: sumBy(items, (o) =>
        numeral(o.zero_rated_amount).value()
      ),
      net_amount: sumBy(items, (o) => numeral(o.net_amount).value()),
    });

    for (let i = 1; i <= column_props.length; i++) {
      ws.lastRow.getCell(i).border = top_border_style;
    }

    ws.addRow().commit();

    try {
      //wb.xlsx.writeFile(filename);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=" + filename);
      wb.xlsx.write(res).then(() => {
        res.end();
        resolve();
      });

      console.log("File written");
    } catch (e) {
      reject(e);
    }
  });
};
