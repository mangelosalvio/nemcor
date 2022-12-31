const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Sales = require("./../../models/Sales");
const SalesOtherSet = require("./../../models/SalesOtherSet");
const AccountCollection = require("./../../models/AccountCollection");

const SalesReturns = require("./../../models/SalesReturns");
const SalesReturnsOtherSet = require("./../../models/SalesReturnsOtherSet");
const AccountSetting = require("./../../models/AccountSetting");
const Table = require("./../../models/Table");
const Xread = require("./../../models/Xread");
const Account = require("./../../models/Account");
const AuditTrail = require("./../../models/AuditTrail");

const Zread = require("./../../models/Zread");
const Counter = require("./../../models/Counter");
const CounterOtherSet = require("./../../models/CounterOtherSet");
const GiftCheck = require("./../../models/GiftCheck");
const isEmpty = require("./../../validators/is-empty");
const moment = require("moment-timezone");
const columnify = require("columnify");
const numberFormat = require("./../../utils/numberFormat");
const round = require("./../../utils/round");
const fs = require("fs");
const asyncForEach = require("./../../utils/asyncForeach");
const util = require("util");

const deductInventoryFromSales =
  require("./../../library/update_inventory").deductInventoryFromSales;

const report_functions = require("./../../library/report_functions");
const numeral = require("numeral");
const escpos = require("./../../config/escpos");
const async = require("async");
const net = require("net");
const constants = require("./../../config/constants");
const {
  printLabelAmountFormat,
  printLabelValueFormat,
} = require("../../utils/printing_functions");
const AccountCollectionOtherSet = require("../../models/AccountCollectionOtherSet");
const {
  updateChargeToAccountBalance,
} = require("../../library/collection-functions");
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const sortBy = require("lodash").sortBy;

const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;

const FILE_WIDTH = process.env.LINE_MAX_CHAR;

let SalesModel = Sales;
let AuditTrailModel = AuditTrail;
let CounterModel = Counter;

const ObjectId = mongoose.Types.ObjectId;

updateGiftChecksUsed = (sale) => {
  if (
    sale.payments &&
    sale.payments.gift_checks &&
    sale.payments.gift_checks.length > 0
  ) {
    sale.payments.gift_checks.forEach((gift_check) => {
      GiftCheck.updateOne(
        {
          "items.gift_check_number": gift_check.items.gift_check_number,
        },
        {
          $set: {
            "items.$.used": {
              sale,
            },
            "items.$.remarks": `USED BY ${sale.customer.name} / OR #${sale.sales_id}`,
          },
        }
      ).exec();
    });
  }
};

/**
 * Unuse gift check on cancel sale
 */

unuseGiftCheck = (sale) => {
  if (
    sale.payments &&
    sale.payments.gift_checks &&
    sale.payments.gift_checks.length > 0
  ) {
    sale.payments.gift_checks.forEach((gift_check) => {
      GiftCheck.update(
        {
          "items.gift_check_number": gift_check.items.gift_check_number,
        },
        {
          $unset: {
            "items.$.used": "",
          },
        }
      ).exec();
    });
  }
};

saveSaleToAccountLedger = (sale) => {
  return new Promise((resolve, reject) => {
    if (
      sale.payments &&
      sale.payments.account &&
      sale.payments.account.account_debit > 0
    ) {
      Account.findById(sale.payments.account._id)
        .then((account) => {
          if (account) {
            const running = round(
              account.ledger[account.ledger.length - 1].running -
                sale.payments.account.account_debit
            );
            const ledger = [
              ...account.ledger,
              {
                date: moment.tz(process.env.TIMEZONE).toDate(),
                particulars: `SI#${sale.sales_id}`,
                debit: sale.payments.account.account_debit,
                credit: 0,
                kind: "sales",
                item: sale._id,
                transaction: sale,
                running,
              },
            ];

            account
              .set({
                ledger,
              })
              .save()
              .then((record) => resolve(record));
          }
        })
        .catch((err) => reject(err));
    }
  });
};

const printCollectionReceipt = (
  transaction,
  { reprint = 0 } = { reprint: 0 }
) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip,
    });

    if (reprint === 0) {
      printer.print(escpos.OPEN_DRAWER_1);
      printer.print(escpos.OPEN_DRAWER_2);
    }

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`${process.env.company_name}\n`);
    printer.print(`${process.env.trade_name}\n`);
    printer.print(`${process.env.company_address}\n`);
    printer.print(`Vat Registered TIN:${process.env.tin}\n`);
    printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

    printer.print(` C O L L E C T I O N   R E C E I P T\n\n`);

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    if (reprint) {
      printer.print(escpos.EMPHASIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print("REPRINT\n");
      printer.print(escpos.NORMAL);
      printer.print(escpos.FONT_B);
      printer.print(moment.tz(moment(), process.env.TIMEZONE).format("lll"));
      printer.print("\n\n");
    }

    if (transaction.deleted && transaction.deleted.datetime) {
      printer.print(escpos.ALIGN_CENTER);
      printer.print(escpos.EMPHASIZE);
      printer.print(`VOIDED\n`);
      printer.print(escpos.NORMAL);
      printer.print(
        `Voided by: ${
          transaction.deleted.user && transaction.deleted.user.name
        }\n`
      );
      printer.print(moment(transaction.deleted.datetime).format("lll"));
      printer.print("\n\n");
    }

    let sales_reference = "CR #";

    printer.print(escpos.INITALIZE);
    printer.print(`Time : ${moment(transaction.datetime).format("LLL")}\n`);
    printer.print(
      `${sales_reference} : ${transaction.account_collection_no
        .toString()
        .padStart(12, "0")}\n`
    );
    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    /* 

    await asyncForEach(transaction.items, (item) => {
      const item_name = `  OS#${item.sales.sales_id}/${numberFormat(
        item.charge_to_account.amount
      )}`;
      const item_amount = numberFormat(item.payment_amount);
      const space = " ".repeat(
        process.env.LINE_MAX_CHAR - item_name.length - item_amount.length
      );

      printer.print(`${item_name}${space}${item_amount}\n`);
      printer.print(escpos.ALIGN_LEFT);
    });

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    let label, amount, space;

    label = `SUBTOTAL:     ${transaction.summary.no_of_items} ITEM(S) `;
    amount = numberFormat(round(transaction.summary.net_of_returns));
    space = " ".repeat(
      process.env.LINE_MAX_CHAR - label.length - amount.length
    );
    printer.print(`${label}${space}${amount}\n`);
    printer.print(escpos.ALIGN_LEFT); */

    if (
      transaction.payments &&
      transaction.payments.credit_cards &&
      transaction.payments.credit_cards.length > 0
    ) {
      transaction.payments.credit_cards.forEach((o) => {
        label = `${o.credit_card.card}/${o.credit_card.card_number.substring(
          o.credit_card.card_number.length - 4
        )}`;
        amount = numberFormat(o.credit_card.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    if (
      transaction.payments &&
      transaction.payments.checks &&
      transaction.payments.checks.length > 0
    ) {
      transaction.payments.checks.forEach((o) => {
        label = `CK:${o.bank}/${o.check_no}`;
        amount = numberFormat(o.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    if (
      transaction.payments &&
      transaction.payments.free_of_charge_payments &&
      transaction.payments.free_of_charge_payments.length > 0
    ) {
      transaction.payments.free_of_charge_payments.forEach((o) => {
        label = `F.O.C.:${o.name}/${o.remarks}`;
        amount = numberFormat(o.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    if (
      transaction.payments &&
      transaction.payments.online_payments &&
      transaction.payments.online_payments.length > 0
    ) {
      transaction.payments.online_payments.forEach((o) => {
        label = `Online:${o.depository}/${o.reference}`;
        amount = numberFormat(o.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    if (
      transaction.payments &&
      transaction.payments.charge_to_accounts &&
      transaction.payments.charge_to_accounts.length > 0
    ) {
      transaction.payments.charge_to_accounts.forEach((o) => {
        label = `Charge:${o.account.name}`;
        amount = numberFormat(o.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    if (
      transaction.payments &&
      transaction.payments.gift_checks &&
      transaction.payments.gift_checks.length > 0
    ) {
      transaction.payments.gift_checks.forEach((o) => {
        label = `GC:${o.gift_check.items.gift_check_number}`;
        amount = numberFormat(o.amount);

        printer.print(
          printLabelAmountFormat({
            label,
            amount,
          })
        );
      });
    }

    /* printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    label = `AMOUNT DUE`;
    amount = numberFormat(round(transaction.summary.amount_due));
    space = " ".repeat(
      process.env.LINE_MAX_CHAR - label.length - amount.length
    );

    printer.print(`${label}${space}${amount}\n`);
    printer.print(escpos.ALIGN_LEFT); */

    if (transaction.payments.cash > 0) {
      label = `CASH`;
      amount = numberFormat(round(transaction.payments.cash));
      space = " ".repeat(
        process.env.LINE_MAX_CHAR - label.length - amount.length
      );
      printer.print(`${label}${space}${amount}\n`);
      printer.print(escpos.ALIGN_LEFT);
    }

    label = `TOTAL DEPOSIT`;
    amount = numberFormat(transaction.payments.deposit_total);
    /* space = " ".repeat(
      process.env.LINE_MAX_CHAR - label.length - amount.length
    ); */
    /* printer.print(`${label}${space}${escpos.EMPHASIZE}${amount}\n`); */

    printer.print(
      `${label}${escpos.CARRIAGE_RETURN}${escpos.ALIGN_RIGHT}${escpos.EMPHASIZE}${amount}\n`
    );

    printer.print(escpos.INITALIZE);

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    printer.print(escpos.ALIGN_LEFT);
    printer.print(escpos.INITALIZE);

    const name_label = "NAME : ";
    const address_label = "ADDRESS : ";
    const tin_label = "TIN : ";
    const business_style_label = "BUSINESS STYLE : ";

    const customer_name =
      (transaction.customer && transaction.customer.customer_name) || "";
    const customer_address =
      (transaction.customer && transaction.customer.address) || "";
    const customer_business_style =
      (transaction.customer && transaction.customer.business_style) || "";
    const customer_tin =
      (transaction.customer && transaction.customer.tin) || "";
    printer.print(
      `${name_label}${escpos.UNDERLINE_ON}${customer_name.padEnd(
        process.env.LINE_MAX_CHAR - name_label.length,
        " "
      )}${escpos.UNDERLINE_OFF}\n`
    );

    printer.print(
      `${address_label}${escpos.UNDERLINE_ON}${customer_address.padEnd(
        process.env.LINE_MAX_CHAR - address_label.length,
        " "
      )}${escpos.UNDERLINE_OFF}\n`
    );

    printer.print(
      `${tin_label}${escpos.UNDERLINE_ON}${customer_tin.padEnd(
        process.env.LINE_MAX_CHAR - tin_label.length,
        " "
      )}${escpos.UNDERLINE_OFF}\n`
    );

    printer.print(
      `${business_style_label}${
        escpos.UNDERLINE_ON
      }${customer_business_style.padEnd(
        process.env.LINE_MAX_CHAR - business_style_label.length,
        " "
      )}${escpos.UNDERLINE_OFF}\n`
    );

    /* printer.print("\n\n");
    printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`); */
    /* printer.print(escpos.ALIGN_CENTER);
    printer.print("POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n");
    printer.print("BIG.D POS V 1.0\n");
    printer.print(`L10 B4 Villa Socorro Subd.\nBrgy. Taculing\n`);
    printer.print(`Bacolod City, Negros Occidental\n`);
    printer.print(`Vat Registered TIN:284-894-233-00000\n`);
    printer.print(`Accred No.:${process.env.ACCRED_NO}\n`);
    printer.print(`Accred Date : ${process.env.ACCRED_DATE}\n`);
    printer.print(`Valid Until : ${process.env.ACCRED_VALID_UNTIL}\n`);
    printer.print(`Permit No:${process.env.PERMIT_NO}\n`);
    printer.print(`Date Issued : ${process.env.PERMIT_DATE_ISSUED}\n`);
    printer.print(`PTU Valid Until:${process.env.PERMIT_VALID_UNTIL}\n\n`);
    printer.print(escpos.BOLD);
    printer.print(
      "THIS RECEIPT SHALL BE VALID FOR FIVE(5) YEARS\nFROM THE DATE OF THE PERMIT TO USE\n"
    ); */

    if (transaction.summary.net_amount > 0) {
      printer.print(escpos.ALIGN_CENTER);
      printer.print("\n");
      printer.print(escpos.BOLD);
      printer.print("THIS DOCUMENT IS NOT VALID\nFOR CLAIM OF INPUT TAX\n");
      printer.print(escpos.BOLD_OFF);
      printer.print("\n");
      printer.print(escpos.ALIGN_LEFT);
    }

    printer.print(escpos.INITALIZE);
    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      console.log(err);
      reject({ message: err });
    }
  });
};
router.post("/reprint/latest", (req, res) => {
  AccountCollection.findOne({}, {}, { sort: { _id: -1 } }).then((record) => {
    if (record) {
      printCollectionReceipt(record, {
        reprint: 1,
      })
        .then(() => {
          return res.json(record);
        })
        .catch((err) => {
          return res.status(401).json({ err });
        });
    } else {
      return res.json({ success: 1 });
    }
  });
});

router.post("/reprint/:id", (req, res) => {
  AccountCollection.findOne({
    account_collection_no: Math.abs(parseInt(req.params.id)),
  }).then((record) => {
    if (record) {
      printCollectionReceipt(record, { reprint: 1 })
        .then(() => {
          return res.json(record);
        })
        .catch((err) => {
          return res.status(401).json({ err });
        });
    } else {
      return res.json(null);
    }
  });
});

router.post("/listings", async (req, res) => {
  let CollectionModel;
  const other_set = req.body.other_set || false;

  if (other_set) {
    CollectionModel = AccountCollectionOtherSet;
  } else {
    CollectionModel = AccountCollection;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  CollectionModel.find({
    datetime: {
      $gte: from_datetime.toDate(),
      $lte: to_datetime.toDate(),
    },
  }).then((records) =>
    res.json({ records, dates: [from_datetime, to_datetime] })
  );
});

router.post("/sales-returns", (req, res) => {
  async.parallel(
    {
      returns: (cb) => {
        Sales.aggregate([
          {
            $match: {
              deleted: {
                $exists: false,
              },
              datetime: {
                $gte: moment(req.body.period_covered[0])
                  .startOf("day")
                  .toDate(),
                $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
              },
              "summary.total_returns": {
                $gt: 0,
              },
            },
          },
          {
            $unwind: "$items",
          },
          {
            $match: {
              "items.quantity": {
                $lt: 0,
              },
            },
          },
        ]).exec(cb);
      },
      latest_zread: (cb) => {
        Zread.findOne({}, { to_sales_id: 1 })
          .sort({ to_sales_id: -1 })
          .limit(1)
          .exec(cb);
      },
    },
    (err, result) => {
      return res.json(result);
    }
  );
});

router.post("/table-movement", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $unwind: {
        path: "$items",
      },
    },
    {
      $match: {
        "items.order": {
          $exists: true,
          $ne: null,
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        sales_id: {
          $first: "$sales_id",
        },
        table_no: {
          $first: "$items.order.table.name",
        },
        start_datetime: {
          $min: {
            $toDate: "$items.order.datetime",
          },
        },
        end_datetime: {
          $first: "$datetime",
        },
      },
    },
    {
      $project: {
        sales_id: 1,
        table_no: 1,
        start_datetime: 1,
        end_datetime: 1,
        minutes: {
          $divide: [
            {
              $subtract: ["$end_datetime", "$start_datetime"],
            },
            60000,
          ],
        },
      },
    },
    {
      $sort: {
        sales_id: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/all-sales-listings", async (req, res) => {
  let SalesModel;
  const other_set = req.body.other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  async.parallel(
    {
      sales: (cb) => {
        SalesModel.find({
          datetime: {
            $gte: from_datetime.toDate(),
            $lte: to_datetime.toDate(),
          },
        }).exec(cb);
      },

      latest_zread: (cb) => {
        Zread.findOne({}, { to_sales_id: 1 })
          .sort({ to_sales_id: -1 })
          .limit(1)
          .exec(cb);
      },
    },
    (err, result) => {
      return res.json({ ...result, from_datetime, to_datetime });
    }
  );
});

router.post("/gross-sales-report", async (req, res) => {
  let SalesModel;

  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  SalesModel.aggregate([
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
          $first: "$items.product.name",
        },
        total_quantity: {
          $sum: "$items.quantity",
        },
        net_sales: {
          $sum: "$items.net_amount",
        },
      },
    },
    {
      $sort: {
        product: 1,
      },
    },
  ]).then((records) => res.json({ records, from_datetime, to_datetime }));
});

router.post("/consolidated-gross-sales-report", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  try {
    const records = await report_functions.getConsolidatedSales({
      from_datetime,
      to_datetime,
    });
    return res.json({ records });
  } catch (err) {
    console.log(err);
    return res.status(401).json(err);
  }
});

router.post("/sales-by-day-report", async (req, res) => {
  let SalesModel;
  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  let dates = [];
  const date = moment(req.body.period_covered[0]);
  const to_date = moment(req.body.period_covered[1]).endOf("day");

  while (date.isBefore(to_date)) {
    const { from_datetime, to_datetime } =
      await report_functions.getPeriodFromRequest({
        from_date: date.clone().startOf("day"),
        to_date: date.clone().endOf("day"),
      });

    dates = [...dates, [from_datetime, to_datetime]];
    date.add({ day: 1 });
  }

  let records = [];
  async.eachSeries(
    dates,
    (period, cb) => {
      SalesModel.aggregate([
        {
          $match: {
            datetime: {
              $gte: period[0].toDate(),
              $lte: period[1].toDate(),
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
          },
        },
        {
          $sort: {
            product: 1,
          },
        },
      ]).then((sales_records) => {
        records = [
          ...records,
          {
            period,
            data: sales_records,
          },
        ];

        cb(null);
      });
    },
    async (err) => {
      if (err) {
        return res.json(err);
      }

      let products = await report_functions.getUniqProductsFromDataSet({
        data: records.map((o) => o.data),
      });

      products = products.map((product) => {
        let product_data = [];

        records.forEach((item) => {
          const sale = item.data.find((o) => o.product._id === product._id);

          if (sale) {
            product_data = [...product_data, sale];
          } else {
            product_data = [...product_data, null];
          }
        });

        return {
          ...product,
          product_data,
        };
      });

      let summary = {
        footer: 1,
        product_data: [],
      };

      dates.forEach((date, index) => {
        summary.product_data[index] = {
          net_sales: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].net_sales) || 0
          ),
          total_quantity: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].total_quantity) ||
              0
          ),
        };
      });

      products = [...products, summary];

      return res.json({ products, dates });
    }
  );
});

router.post("/consolidated-sales-by-day-report", async (req, res) => {
  let dates = [];
  const date = moment(req.body.period_covered[0]);
  const to_date = moment(req.body.period_covered[1]).endOf("day");

  while (date.isBefore(to_date)) {
    const { from_datetime, to_datetime } =
      await report_functions.getPeriodFromRequest({
        from_date: date.clone().startOf("day"),
        to_date: date.clone().endOf("day"),
      });

    dates = [...dates, [from_datetime, to_datetime]];
    date.add({ day: 1 });
  }

  let records = [];
  async.eachSeries(
    dates,
    (period, cb) => {
      report_functions
        .getConsolidatedSales({
          from_datetime: period[0],
          to_datetime: period[1],
        })
        .then((sales_records) => {
          records = [
            ...records,
            {
              period,
              data: sales_records,
            },
          ];

          cb(null);
        });
    },
    async (err) => {
      if (err) {
        return res.json(err);
      }

      let products = await report_functions.getUniqProductsFromDataSet({
        data: records.map((o) => o.data),
      });

      products = products.map((product) => {
        let product_data = [];

        records.forEach((item) => {
          const sale = item.data.find((o) => o.product._id === product._id);

          if (sale) {
            product_data = [...product_data, sale];
          } else {
            product_data = [...product_data, null];
          }
        });

        return {
          ...product,
          product_data,
        };
      });

      let summary = {
        footer: 1,
        product_data: [],
      };

      dates.forEach((date, index) => {
        summary.product_data[index] = {
          net_sales: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].net_sales) || 0
          ),
          total_quantity: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].total_quantity) ||
              0
          ),
        };
      });

      products = [...products, summary];

      return res.json({ products, dates });
    }
  );
});

router.post("/write", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.dates[0],
      to_date: req.body.dates[1],
    });

  Sales.find(
    {
      datetime: {
        $gte: from_datetime.toDate(),
        $lte: to_datetime.toDate(),
      },
    },
    {},
    { sort: { _id: 1 } }
  ).then(async (sales) => {
    if (sales) {
      let content = "";

      await asyncForEach(sales, async (sale) => {
        content += await writeSale(sale);
      });

      const filename = "virtual-receipts.txt";

      fs.writeFile(filename, content, (err) => {
        if (err) {
          console.log(err);
          return res.status(401).json({ err });
        }

        trackVirtualReceiptDownload({
          dates: req.body.dates,
          user: req.body.user,
        });

        return res.download(filename);
      });
    }
  });
});

router.post("/write-returns", (req, res) => {
  const id = req.body._id;
  SalesReturns.find(
    {
      datetime: {
        $gte: moment(req.body.dates[0]).startOf("day").toDate(),
        $lte: moment(req.body.dates[1]).endOf("day").toDate(),
      },
    },
    {},
    { sort: { _id: 1 } }
  ).then((sales) => {
    if (sales) {
      let content = "";

      sales.forEach((sale) => {
        content += writeSale(sale);
      });

      const filename = "virtual-receipts-retursns.txt";

      fs.writeFile(filename, content, (err) => {
        if (err) {
          console.log(err);
          return res.status(401).json({ err });
        }

        trackVirtualReceiptDownload({
          dates: req.body.dates,
          user: req.body.user,
        });

        return res.download(filename);
      });
    }
  });
});

router.post("/xread", async (req, res) => {
  const now = moment.tz(moment(), process.env.TIMEZONE);

  const { start_time: opening_time, end_time: closing_time } =
    await report_functions.getStoreHours(now.toDate());

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

  if (xread) {
    /**
     * HAS XREAD
     */

    from_date = moment(xread.transaction_date).toDate();
  } else {
    /**
     * HAS NO XREAD
     */
    from_date = opening_time.clone().toDate();
  }

  /**
   * check if there are sale items to process
   */

  const sales_count = await report_functions.getSalesCount({
    from_date,
    to_date,
  });

  if (sales_count <= 0) {
    return res.status(401).json({
      msg: "Unable to Xread. No Sales Transaction",
    });
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
        Sales.aggregate([
          {
            $match: {
              datetime: {
                $gt: from_date,
                $lte: to_date,
              },
            },
          },
          ...sales_query,
        ]).exec(cb);
      },
      valid_sales: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      voided_sales: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
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
        ]).exec(cb);
      },
      credit_card_transactions: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      credit_card_summary: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      credit_card_sales: (cb) => {
        Sales.aggregate([
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
            $unwind: {
              path: "$payments.credit_cards",
            },
          },
          {
            $group: {
              _id: null,
              amount: {
                $sum: "$payments.credit_cards.credit_card.amount",
              },
            },
          },
        ]).exec(cb);
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
        }

        if (result.sales_returns.length > 0) {
          total_returns = Math.abs(round(result.sales_returns[0].net_amount));
          net_amount += round(total_returns);
          vat_sales += round(result.sales_returns[0].vat_sales);
          vat_exempt += round(result.sales_returns[0].vat_exempt);
          vat_amount += round(result.sales_returns[0].vat_amount);
          non_vat_amount += round(result.sales_returns[0].non_vat_amount);
        }

        const trans_result = await CounterModel.increment("trans_id");

        let xread = {
          trans_id: trans_result.next,
          xread_id: next,
          user: req.body.user,
          transaction_date: date,
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
          net_amount,
          vat_sales,
          vat_exempt,
          vat_amount,
          non_vat_amount,
          from_sales_id,
          to_sales_id,
          number_of_voided_invoices,
          credit_card_transactions: result.credit_card_transactions,
          credit_card_summary: result.credit_card_summary,
          credit_card_sales,
          cash_sales,
        };

        const newXread = new Xread({
          ...xread,
        });

        newXread.save().then((xread) => {
          printXread({ ...xread.toObject() });
          trackXread(xread);
          return res.json(xread);
        });
      });
    }
  );
});

router.post("/xread-reprint", (req, res) => {
  const xread_id = req.body.xread_id;
  Xread.findOne({
    xread_id,
  }).then((xread) => {
    /* trackXread(xread, { reprint: 1 }); */
    if (xread) {
      printXread(xread, {
        reprint: 1,
      });
      return res.json({ success: 1 });
    } else {
      return res.status(401).json({ error: 1 });
    }
  });
});

router.post("/xread-range-reprint", (req, res) => {
  const dates = req.body.dates;
  const from_date = moment(dates[0]);
  const to_date = moment(dates[1]);

  Xread.find({
    transaction_date: {
      $gte: from_date.startOf("day").toDate(),
      $lte: to_date.endOf("day").toDate(),
    },
  }).then(async (records) => {
    await asyncForEach([...records], async (record) => {
      trackXread(record, { reprint: 1 });
      printXread(record, {
        reprint: 1,
      });
      await report_functions.sleep(1000);
    });

    return res.json({ success: 1 });
  });
});

router.post("/credit-cards", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
        "payments.credit_cards": {
          $exists: true,
          $not: {
            $size: 0,
          },
        },
      },
    },
    {
      $unwind: {
        path: "$payments.credit_cards",
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/gift-checks", (req, res) => {
  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
        "payments.gift_checks": {
          $exists: true,
          $not: {
            $size: 0,
          },
        },
      },
    },
    {
      $unwind: {
        path: "$payments.gift_checks",
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/reprint/latest", (req, res) => {
  Sales.findOne({}, {}, { sort: { _id: -1 } }).then((sale) => {
    if (sale) {
      trackSale(sale, {
        reprint: true,
      });
      printSale(sale, {
        reprint: 1,
      })
        .then(() => {
          return res.json(sale);
        })
        .catch((err) => {
          return res.status(401).json({ err });
        });
    } else {
      return res.json({ success: 1 });
    }
  });
});

router.post("/reprint/:id", (req, res) => {
  let Model = Sales;

  if (parseInt(req.params.id) < 0) {
    Model = SalesReturns;
  }

  Model.findOne({
    sales_id: Math.abs(parseInt(req.params.id)),
  }).then((sale) => {
    if (sale) {
      if (sale.summary.net_amount < 0) {
        trackSalesReturn(sale, {
          reprint: true,
        });
      } else {
        trackSale(sale, {
          reprint: true,
        });
      }

      printSale(sale, { reprint: 1 })
        .then(() => {
          return res.json(sale);
        })
        .catch((err) => {
          return res.status(401).json({ err });
        });
    } else {
      return res.json(null);
    }
  });
});

router.post("/reprint", (req, res) => {
  let SalesModel;
  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const id = req.body._id;
  SalesModel.findById(id).then((sale) => {
    printSale(sale, {
      reprint: 1,
      SalesModel,
    });
    trackSale(sale, {
      reprint: true,
    });
    return res.json({ success: 1 });
  });
});

router.post("/zread-reprint", (req, res) => {
  const zread_id = req.body.zread_id;
  Zread.findOne({
    zread_id,
  }).then((zread) => {
    /* trackXread(xread, { reprint: 1 }); */
    if (zread) {
      printZread(zread, {
        reprint: 1,
      });
      return res.json({ success: 1 });
    } else {
      return res.status(401).json({ error: 1 });
    }
  });
});

router.post("/zread-range-reprint", (req, res) => {
  const dates = req.body.dates;
  const from_date = moment(dates[0]);
  const to_date = moment(dates[1]);

  Zread.find({
    from_datetime: {
      $gte: from_date.startOf("day").toDate(),
      $lte: to_date.endOf("day").toDate(),
    },
  }).then(async (records) => {
    await asyncForEach([...records], async (zread) => {
      printZread(zread, {
        reprint: 1,
      });
      trackZread(zread, {
        reprint: true,
      });
      await report_functions.sleep(1000);
    });

    return res.json({ success: 1 });
  });
});

/**
 * return
 *  TRUE - ZREAD is found
 * FALSE - ZREAd not found
 */

router.post("/has-zread", async (req, res) => {
  const now = moment.tz(moment(), process.env.TIMEZONE);

  const closing_time_result = await AccountSetting.findOne({
    key: constants.CLOSING_TIME,
  });

  const closing_time = closing_time_result.value;

  const opening_time_result = await AccountSetting.findOne({
    key: constants.OPENING_TIME,
  });

  const opening_time = opening_time_result.value;

  const open_time = moment(
    `${now.clone().format("YYYY-MM-DD")} ${moment(opening_time).format(
      "HH:mm"
    )}`
  );

  if (now.clone().hours() >= open_time.hours() && now.clone().hours() <= 23) {
    /**
     * closed with in the same day (early closing)
     */
    from_date = open_time.clone();
  } else {
    /**
     * next day closing
     */
    from_date = open_time.clone().subtract({ day: 1 });
  }

  Zread.findOne({
    from_datetime: from_date.clone().toDate(),
    deleted: {
      $exists: false,
    },
  })
    .sort({
      _id: -1,
    })
    .then((zread) => {
      const status = zread ? true : false;
      return res.json({ status });
    });
});

router.post("/zread", async (req, res) => {
  const now = moment.tz(moment(), process.env.TIMEZONE);
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
        count: {
          $sum: 1,
        },
      },
    },
  ];

  async.parallel(
    {
      all_sales: (cb) => {
        Sales.aggregate([
          {
            $match: {
              datetime: {
                $gte: from_date,
                $lte: to_date,
              },
            },
          },
          ...sales_query,
        ]).exec(cb);
      },
      valid_sales: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      voided_sales: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      old_sales: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
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
        ]).exec(cb);
      },
      credit_card_transactions: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      credit_card_summary: (cb) => {
        Sales.aggregate([
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
        ]).exec(cb);
      },
      credit_card_sales: (cb) => {
        Sales.aggregate([
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
            $unwind: {
              path: "$payments.credit_cards",
            },
          },
          {
            $group: {
              _id: null,
              amount: {
                $sum: "$payments.credit_cards.credit_card.amount",
              },
            },
          },
        ]).exec(cb);
      },
    },
    (err, result) => {
      CounterModel.increment("zread_id").then(async ({ next }) => {
        const date = moment.tz(moment(), process.env.TIMEZONE);

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

        const trans_result = await CounterModel.increment("trans_id");

        let zread = {
          trans_id: trans_result.next,
          zread_id: next,
          user: req.body.user,
          transaction_date: date,
          date_printed: date,
          from_datetime: from_date,
          to_datetime: to_date,
          gross_amount,
          total_returns,
          net_of_returns,
          less_vat,
          less_sc_disc,
          less_disc,
          voided_sales,
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
          credit_card_summary: result.credit_card_summary,
          credit_card_sales,
          cash_sales,
        };

        const newZread = new Zread({
          ...zread,
        });

        newZread.save().then((zread) => {
          printZread({ ...zread.toObject() });
          trackZread(zread);
          return res.json(zread);
        });
      });
    }
  );
});

router.post("/account-sales", (req, res) => {
  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
        "payments.account._id": {
          $exists: true,
        },
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/sales", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  Sales.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/sales-returns-listings", (req, res) => {
  SalesReturns.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        datetime: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/zread-listings", (req, res) => {
  Zread.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        from_datetime: {
          $gte: moment(req.body.period_covered[0]).startOf("day").toDate(),
          $lte: moment(req.body.period_covered[1]).endOf("day").toDate(),
        },
      },
    },
    {
      $sort: {
        from_datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json(records);
  });
});

router.post("/xread-listings", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  Xread.aggregate([
    {
      $match: {
        deleted: {
          $exists: false,
        },
        transaction_date: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $sort: {
        transaction_date: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/voided-sales", async (req, res) => {
  let SalesModel;
  const other_set = req.body.other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  SalesModel.aggregate([
    {
      $match: {
        deleted: {
          $exists: true,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ]).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/daily-summary", async (req, res) => {
  let from_datetime = moment(req.body.period_covered[0]);
  let to_datetime = moment(req.body.period_covered[1]);

  const closing_time_result = await AccountSetting.findOne({
    key: constants.CLOSING_TIME,
  });

  const closing_time = moment(closing_time_result.value);

  const opening_time_result = await AccountSetting.findOne({
    key: constants.OPENING_TIME,
  });

  const opening_time = moment(opening_time_result.value);

  let project_query;

  from_datetime = moment(
    `${from_datetime.clone().format("YYYY-MM-DD")} ${opening_time.format(
      "HH:mm"
    )}`
  );

  /**
   * Closes on the next day
   */
  if (opening_time.hours() > closing_time.hours()) {
    to_datetime = moment(
      `${to_datetime.clone().format("YYYY-MM-DD")} ${closing_time.format(
        "HH:mm"
      )}`
    ).add({ day: 1 });

    project_query = {
      sales_id: 1,
      datetime: 1,
      summary: 1,
      day_of_year: {
        $cond: {
          if: {
            $lt: [
              {
                $hour: {
                  date: "$datetime",
                  timezone: process.env.TIMEZONE,
                },
              },
              opening_time.hours(),
            ],
          },
          then: {
            $subtract: [
              {
                $dayOfYear: {
                  date: "$datetime",
                  timezone: process.env.TIMEZONE,
                },
              },
              1,
            ],
          },
          else: {
            $dayOfYear: {
              date: "$datetime",
              timezone: process.env.TIMEZONE,
            },
          },
        },
      },
    };
  } else {
    /**
     * Closes on the same day
     */

    to_datetime = moment(
      `${to_datetime.clone().format("YYYY-MM-DD")} ${moment(
        closing_time
      ).format("HH:mm")}`
    );

    project_query = {
      sales_id: 1,
      datetime: 1,
      summary: 1,
      day_of_year: {
        $dayOfYear: {
          date: "$datetime",
          timezone: process.env.TIMEZONE,
        },
      },
    };
  }

  /* console.log(from_datetime.format("LLL"), to_datetime.format("LLL")); */

  async.parallel(
    {
      summary: (cb) => {
        Sales.aggregate([
          {
            $match: {
              deleted: {
                $exists: false,
              },
              datetime: {
                $gte: from_datetime.toDate(),
                $lte: to_datetime.toDate(),
              },
            },
          },
          {
            $project: {
              ...project_query,
            },
          },
          {
            $group: {
              _id: "$day_of_year",
              datetime: {
                $first: "$datetime",
              },
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
              cash_sales: {
                $sum: {
                  $toDecimal: "$summary.cash_sales",
                },
              },
              credit_card_sales: {
                $sum: {
                  $toDecimal: "$summary.credit_card_sales",
                },
              },
              /*,
              account_sales: {
                $sum: {
                  $toDecimal: "$summary.account_sales"
                }
            },
              gift_check_sales: {
                $sum: {
                  $toDecimal: "$summary.gift_check_sales"
                }
              } */
            },
          },
          {
            $sort: {
              datetime: 1,
            },
          },
        ]).exec(cb);
      },
    },
    (err, result) => {
      return res.json({
        records: result.summary,
        from_datetime,
        to_datetime,
      });
    }
  );
});

router.get("/summary", (req, res) => {
  const startDate = new moment().startOf("day").toDate();
  const endDate = new moment().endOf("day").toDate();
  Sales.aggregate([
    {
      $match: {
        datetime: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $unwind: "$orders",
    },
    {
      $group: {
        _id: "$orders.product.name",
        name: {
          $first: "$orders.product.name",
        },
        quantity: {
          $sum: "$orders.quantity",
        },
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
  ]).then((result) => res.json(result));
});

router.get("/consumed", (req, res) => {
  const startDate = new moment().startOf("day").toDate();
  const endDate = new moment().endOf("day").toDate();
  Sales.aggregate([
    {
      $match: {
        datetime: {
          $gte: startDate,
          $lte: endDate,
        },
        "orders.product.raw_materials": {
          $exists: true,
          $ne: [],
        },
      },
    },
    {
      $unwind: "$orders",
    },
    {
      $unwind: "$orders.product.raw_materials",
    },
    {
      $group: {
        _id: "$orders.product.raw_materials.raw_material.name",
        name: {
          $first: "$orders.product.raw_materials.raw_material.name",
        },
        quantity: {
          $sum: {
            $multiply: [
              "$orders.product.raw_materials.raw_material_quantity",
              "$orders.quantity",
            ],
          },
        },
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
  ]).then((result) => res.json(result));
});

router.get("/invoices", (req, res) => {
  Sales.find({
    datetime: {
      $gte: req.query.startDate,
      $lte: req.query.endDate,
    },
  })
    .then((sales) => res.json(sales))
    .catch((err) => console.log(err));
});

router.get("/:id/other-set", (req, res) => {
  SalesOtherSet.findById(req.params.id)
    .then(async (record) => {
      const seniors = await getSeniorsFromSale(record, SalesOtherSet);

      return res.json({
        ...record.toObject(),
        seniors,
      });
    })
    .catch((err) => console.log(err));
});

router.get("/:id", (req, res) => {
  Sales.findById(req.params.id)
    .then(async (record) => {
      const seniors = await getSeniorsFromSale(record);

      return res.json({
        ...record.toObject(),
        seniors,
      });
    })
    .catch((err) => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        name: {
          $regex: "^" + req.query.s,
        },
      };

  Table.find(form_data)
    .then((table) => {
      return res.json(table);
    })
    .catch((err) => console.log(err));
});

router.put("/", (req, res) => {
  let Model = AccountCollection;
  let SalesModel = Sales;
  let trans = "account_collection_no";

  const other_set = req.body.is_other_set || false;

  if (other_set) {
    CounterModel = CounterOtherSet;
    Model = AccountCollectionOtherSet;
    SalesModel = SalesOtherSet;
  } else {
    CounterModel = Counter;
    Model = AccountCollection;
  }

  CounterModel.increment(trans).then(async ({ next }) => {
    const record = {
      account_collection_no: next,
      datetime: moment.tz(process.env.TIMEZONE).toDate(),
      items: req.body.items,
      customer: req.body.customer,
      summary: req.body.summary,
      payments: req.body.payments,
      user: req.body.user,
      account: req.body.account,
    };

    const newRecord = new Model(record);

    newRecord.save().then((record) => {
      //clear table here

      printCollectionReceipt(
        { ...record.toObject() },
        {
          reprint: 0,
        }
      );

      /**
       * update account charges of sales
       */

      record.items.forEach((item) => {
        updateChargeToAccountBalance({
          charge_to_account_id: item.charge_to_account._id,
          SalesModel,
          payment_amount: item.payment_amount,
        });
      });

      return res.json({ success: 1 });
    });
  });
});

router.delete("/:sales_id/sales-id", (req, res) => {
  const sales_id = req.params.sales_id;
  async.parallel(
    {
      sale: (cb) => {
        Sales.findOne({
          sales_id: sales_id,
          deleted: {
            $exists: false,
          },
        }).exec(cb);
      },
      latest_zread: (cb) => {
        Zread.findOne({}, { to_sales_id: 1 })
          .sort({ to_sales_id: -1 })
          .limit(1)
          .exec(cb);
      },
    },
    (err, result) => {
      if (result.sale) {
        if (
          result.latest_zread &&
          result.latest_zread.to_sales_id >= sales_id
        ) {
          return res
            .status(401)
            .json({ msg: "Unable to void sale after zread" });
        }

        /** void sale */

        const deleted = {
          user: req.body.user,
          authorized_by: req.body.authorized_by,
          datetime: moment.tz(moment(), process.env.TIMEZONE),
          reason: req.body.reason,
          old_trans_id: result.sale.trans_id,
        };

        Sales.findByIdAndUpdate(
          result.sale._id,
          {
            $set: {
              deleted,
            },
          },
          {
            new: true,
          }
        ).then((voided_sale) => {
          trackSaleVoided(voided_sale.toObject());
          return res.json({ id: req.params.sales_id, user: req.body.user });
        });
      } else {
        /**
         * no sale
         */

        return res.status(401).json({ msg: "Sale reference not found" });
      }
    }
  );
});

router.delete("/:id", (req, res) => {
  let SalesModel;
  let other_set = req.body.other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const deleted = {
    user: req.body.user,
    datetime: moment.tz(moment(), process.env.TIMEZONE),
    reason: req.body.reason,
  };

  SalesModel.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted,
      },
    },
    {
      new: true,
    }
  ).then((voided_sale) => {
    if (!other_set) {
      trackSaleVoided(voided_sale.toObject());
    }

    return res.json({ id: req.params.id, user: req.body.user });
  });
});

creditAccountOnVoidSale = (sale) => {
  if (sale.payments && sale.payments.account) {
    const sale_account = sale.payments.account;

    Account.findById(sale_account._id).then((account) => {
      if (account) {
        let ledger = [...account.ledger];
        const last_ledger = ledger[ledger.length - 1];
        const running_balance = last_ledger.running
          ? round(last_ledger.running)
          : 0;
        const new_running_balance = round(
          running_balance + sale_account.account_debit
        );

        ledger = [
          ...ledger,
          {
            date: moment.tz(moment(), process.env.TIMEZONE),
            particulars: `Voided Sale SI#${sale.sales_id}`,
            debit: 0,
            credit: round(sale_account.account_debit),
            running: new_running_balance,
          },
        ];
        account.ledger = [...ledger];
        account.save();
      }
    });
  }
};

const printZread = (zread, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip,
    });

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`${process.env.trade_name}\n`);
    printer.print(`${process.env.company_name}\n`);
    printer.print(`${process.env.company_address}\n`);
    printer.print(`Vat Registered TIN:${process.env.tin}\n`);
    printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

    printer.print(`Z R E A D\n\n`);

    if (reprint) {
      printer.print(escpos.EMPHASIZE);
      printer.print("REPRINT\n");
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(moment.tz(moment(), process.env.TIMEZONE).format("lll"));
      printer.print("\n\n");
    }

    printer.print(escpos.INITALIZE);

    printer.print(
      printLabelValueFormat({
        label: `REGISTER`,
        value: 1,
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `TRANS #`,
        value: zread.trans_id.toString().padStart(12, "0"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `ZREAD #`,
        value: zread.zread_id.toString().padStart(12, "0"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `FROM DATE/TIME`,
        value: moment(zread.from_datetime).format("LLLL"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `TO DATE/TIME`,
        value: moment(zread.to_datetime).format("LLLL"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `SERIAL`,
        value: process.env.serial_no,
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `USER`,
        value: zread.user.name,
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `TRANS DATE`,
        value: moment(zread.transaction_date).format("LL"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `PRINTED`,
        value: moment(zread.date_printed).format("LLL"),
      })
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    /**
     * START OF CREDIT CARD
     */

    if (zread.credit_card_transactions.length > 0) {
      printer.print("CREDIT CARD TRANSACTIONS\n");

      zread.credit_card_transactions.forEach((o) => {
        printer.print(
          printLabelValueFormat({
            label: `  SI#`,
            value: o.sales_id,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  CARD`,
            value: o.credit_card.card,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  CARD NUMBER`,
            value: o.credit_card.card_number,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  REFERENCE #`,
            value: o.credit_card.reference_number,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  TRACE NUMBER`,
            value: o.credit_card.approval_code,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `  AMOUNT`,
            amounte: o.credit_card.amount,
          })
        );
        printer.print("\n");
      });

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    }

    if (zread.credit_card_summary.length > 0) {
      printer.print("CREDIT CARD SUMMARY\n");
      zread.credit_card_summary.forEach((o) => {
        printer.print(
          printLabelAmountFormat({
            label: o.card,
            amountvalue: o.amount,
          })
        );
      });
      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    }

    /**
     * END OF CREDIT CARD
     */

    printer.print(
      printLabelAmountFormat({
        label: `GROSS AMOUNT`,
        amount: zread.net_of_returns,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS RETURNS`,
        amount: zread.total_returns,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS VAT SC/PWD DEDUCTION`,
        amount: zread.less_vat,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS SC DISC`,
        amount: zread.less_sc_disc,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS DISC`,
        amount: zread.less_disc,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VOIDED SALES`,
        amount: zread.voided_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `CASH SALES`,
        amount: zread.cash_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `CREDIT CARD SALES`,
        amount: zread.credit_card_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `NET AMOUNT`,
        amount: zread.net_amount,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT SALES`,
        amount: zread.vat_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT EXEMPT`,
        amount: zread.vat_exempt,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT AMOUNT`,
        amount: zread.vat_amount,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `NON VAT AMOUNT`,
        amount: zread.non_vat_amount,
      })
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    printer.print(
      printLabelAmountFormat({
        label: `OLD GRAND TOTAL SALES`,
        amount: zread.old_grand_total_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `NEW GRAND TOTAL SALES`,
        amount: zread.new_grand_total_sales,
      })
    );

    printer.print(
      `INVOICE FROM ${zread.from_sales_id} TO ${zread.to_sales_id}\n`
    );

    printer.print(`# OF VOIDED INVOICES ${zread.number_of_voided_invoices}\n`);

    printer.print(escpos.INITALIZE);
    printer.print("\n\n");
    printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
    printer.print(escpos.ALIGN_CENTER);
    printer.print("POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n");

    printer.print("BIG.D POS V 1.0\n");
    printer.print(`L10 B4 Villa Socorro Subd.\nBrgy. Taculing\n`);
    printer.print(`Bacolod City, Negros Occidental\n`);
    printer.print(`Vat Registered TIN:284-894-233-00000\n`);
    printer.print(`Accred No.:${process.env.ACCRED_NO}\n`);
    printer.print(`Accred Date : ${process.env.ACCRED_DATE}\n`);
    printer.print(`Valid Until : ${process.env.ACCRED_VALID_UNTIL}\n`);
    printer.print(`Permit No:${process.env.PERMIT_NO}\n`);
    printer.print(`Date Issued : ${process.env.PERMIT_DATE_ISSUED}\n`);
    printer.print(`PTU Valid Until:${process.env.PERMIT_VALID_UNTIL}\n\n`);
    printer.print(escpos.BOLD);

    printer.print(escpos.INITALIZE);
    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      console.log(err);
      reject({ message: err });
    }
  });
};

const printXread = (xread, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip,
    });

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`${process.env.trade_name}\n`);
    printer.print(`${process.env.company_name}\n`);
    printer.print(`${process.env.company_address}\n`);
    printer.print(`Vat Registered TIN:${process.env.tin}\n`);
    printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

    printer.print(`X R E A D\n\n`);

    if (reprint) {
      printer.print(escpos.EMPHASIZE);
      printer.print("REPRINT\n");
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(escpos.NORMAL);
      printer.print(moment.tz(moment(), process.env.TIMEZONE).format("lll"));
      printer.print("\n\n");
    }

    printer.print(escpos.INITALIZE);

    printer.print(
      printLabelValueFormat({
        label: `REGISTER`,
        value: "1",
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `TRANS #`,
        value: xread.trans_id.toString().padStart(12, "0"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `XREAD #`,
        value: xread.xread_id.toString().padStart(12, "0"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `SERIAL`,
        value: process.env.serial_no,
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `USER`,
        value: xread.user.name,
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `TRANS DATE`,
        value: moment(xread.transaction_date).format("LL"),
      })
    );

    printer.print(
      printLabelValueFormat({
        label: `PRINTED`,
        value: moment(xread.date_printed).format("LLL"),
      })
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    /**
     * START OF CREDIT CARD
     */

    if (xread.credit_card_transactions.length > 0) {
      printer.print("CREDIT CARD TRANSACTIONS\n");

      xread.credit_card_transactions.forEach((o) => {
        printer.print(
          printLabelValueFormat({
            label: `  SI#`,
            value: o.sales_id,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  CARD`,
            value: o.credit_card.card,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  CARD NUMBER`,
            value: o.credit_card.card_number,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  REFERENCE #`,
            value: o.credit_card.reference_number,
          })
        );

        printer.print(
          printLabelValueFormat({
            label: `  TRACE NUMBER`,
            value: o.credit_card.approval_code,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `  AMOUNT`,
            amount: o.credit_card.amount,
          })
        );
        printer.print("\n");
      });
      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    }

    if (xread.credit_card_summary.length > 0) {
      printer.print("CREDIT CARD SUMMARY\n");
      xread.credit_card_summary.forEach((o) => {
        printer.print(
          printLabelAmountFormat({
            label: o.card,
            amount: o.amount,
          })
        );
      });
      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    }

    /**
     * END OF CREDIT CARD
     */

    printer.print(
      printLabelAmountFormat({
        label: `GROSS AMOUNT`,
        amount: xread.net_of_returns,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS RETURNS`,
        amount: xread.total_returns,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS VAT SC/PWD DEDUCTION`,
        amount: xread.less_vat,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS SC DISC`,
        amount: xread.less_sc_disc,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `LESS DISC`,
        amount: xread.less_disc,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VOIDED SALES`,
        amount: xread.voided_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `CASH SALES`,
        amount: xread.cash_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `CREDIT CARD SALES`,
        amount: xread.credit_card_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `NET AMOUNT`,
        amount: xread.net_amount,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT SALES`,
        amount: xread.vat_sales,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT EXEMPT`,
        amount: xread.vat_exempt,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `VAT AMOUNT`,
        amount: xread.vat_amount,
      })
    );

    printer.print(
      printLabelAmountFormat({
        label: `NON VAT AMOUNT`,
        amount: xread.non_vat_amount,
      })
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    printer.print(
      `  INVOICE FROM ${xread.from_sales_id} TO ${xread.to_sales_id}\n`
    );

    printer.print(
      `  # OF VOIDED INVOICES ${xread.number_of_voided_invoices}\n`
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    printer.print(escpos.INITALIZE);
    printer.print("\n\n");
    printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
    printer.print(escpos.ALIGN_CENTER);

    printer.print("POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n");
    printer.print("BIG.D POS V 1.0\n");
    printer.print(`L10 B4 Villa Socorro Subd.\nBrgy. Taculing\n`);
    printer.print(`Bacolod City, Negros Occidental\n`);
    printer.print(`Vat Registered TIN:284-894-233-00000\n`);
    printer.print(`Accred No.:${process.env.ACCRED_NO}\n`);
    printer.print(`Accred Date : ${process.env.ACCRED_DATE}\n`);
    printer.print(`Valid Until : ${process.env.ACCRED_VALID_UNTIL}\n`);
    printer.print(`Permit No:${process.env.PERMIT_NO}\n`);
    printer.print(`Date Issued : ${process.env.PERMIT_DATE_ISSUED}\n`);
    printer.print(`PTU Valid Until:${process.env.PERMIT_VALID_UNTIL}\n\n`);
    printer.print(escpos.BOLD);

    printer.print(escpos.INITALIZE);
    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      console.log(err);
      reject({ message: err });
    }
  });
};

updateGiftCheckStatusToSold = (sale) => {
  Sales.aggregate([
    {
      $match: {
        _id: sale._id,
        "orders.items.product.is_gift_check": true,
      },
    },
    {
      $unwind: {
        path: "$orders",
      },
    },
    {
      $unwind: {
        path: "$orders.items",
      },
    },
    {
      $match: {
        "orders.items.product.is_gift_check": true,
      },
    },
    {
      $project: {
        customer: "$customer",
        gift_check_reference: "$orders.items.product.gc_reference",
      },
    },
  ])
    .then((gift_checks) => {
      gift_checks.forEach((gc) => {
        GiftCheck.update(
          {
            "items.gift_check_number": gc.gift_check_reference,
          },
          {
            $set: {
              "items.$.sold": {
                sale,
              },
              "items.$.remarks": `SOLD TO ${sale.customer.name} / OR #${sale.sales_id}`,
            },
          }
        ).exec();
      });
    })
    .catch((err) => console.log(err));
};

trackVirtualReceiptDownload = async ({ dates, user }) => {
  const trans_result = await CounterModel.increment("trans_id");
  trans_id = trans_result.next;

  const remarks = `${user.name} downloaded virtual receipts from ${moment(
    dates[0]
  ).format("MM/DD/YY")} to ${moment(dates[1]).format("MM/DD/YY")}`;

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: user,
    activity: `Download Virtual Receipt(s)`,
    reference: trans_id,
    trans_id,
    amount: 0,
    remarks,
  });
  auditTrail.save();
};

trackSale = async (sale, { reprint = false } = { reprint: false }) => {
  let trans_id = sale.trans_id;
  /* if (reprint) {
    const trans_result = await CounterModel.increment("trans_id");
    trans_id = trans_result.next;
  } */

  let amount = sale.summary && sale.summary.net_amount;
  amount = sale.deleted && sale.deleted.datetime ? 0 : amount;

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: sale.user,
    activity: reprint ? "Sale Reprint" : "Sale Added",
    reference: sale.sales_id,
    trans_id: trans_id,
    amount,
  });

  auditTrail.save();
};

trackSalesReturn = async (sale, { reprint = false } = { reprint: false }) => {
  let trans_id = sale.trans_id;
  /* if (reprint) {
    const trans_result = await CounterModel.increment("trans_id");
    trans_id = trans_result.next;
  } */

  let amount = sale.summary && sale.summary.net_amount;
  amount = sale.deleted && sale.deleted.datetime ? 0 : amount;

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: sale.user,
    activity: reprint ? "Sales Return Reprint" : "Sales Return Added",
    reference: sale.sales_id,
    trans_id: trans_id,
    amount,
  });

  auditTrail.save();
};

trackSaleVoided = async (sale) => {
  const trans_result = await CounterModel.increment("trans_id");
  trans_id = trans_result.next;

  Sales.findById(sale._id).then((sale) => {
    sale.trans_id = trans_id;
    sale.save().then((sale) => {
      printSale(sale, {
        reprint: 1,
      });
    });
  });

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: sale.user,
    activity: "Sale Voided",
    reference: sale.sales_id,
    trans_id,
    amount: 0,
    old_value: sale.summary.net_amount,
    new_value: 0,
    remarks: sale.deleted.reason,
  });
  auditTrail.save();
};

trackXread = async (xread, { reprint = false } = { reprint: false }) => {
  let trans_id = xread.trans_id;
  /* if (reprint) {
    const trans_result = await CounterModel.increment("trans_id");
    trans_id = trans_result.next;
  } */

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: xread.user,
    activity: reprint ? "Xread Reprint" : "Xread Added",
    reference: xread.xread_id,
    trans_id,
    amount: xread.net_amount,
  });
  auditTrail.save();
};

trackZread = async (zread, { reprint = false } = { reprint: false }) => {
  let trans_id = zread.trans_id;
  /* if (reprint) {
    const trans_result = await CounterModel.increment("trans_id");
    trans_id = trans_result.next;
  } */

  const auditTrail = new AuditTrailModel({
    date: moment.tz(moment(), process.env.TIMEZONE).toDate(),
    user: zread.user,
    activity: reprint ? "Zread Reprint" : "Zread Added",
    reference: zread.zread_id,
    trans_id,
    amount: zread.net_amount,
  });
  auditTrail.save();
};

const writeSale = async (sale) => {
  const seniors = await getSeniorsFromSale(sale);
  let content = "";
  let column;

  let data = [
    {
      heading: process.env.trade_name,
    },
    {
      heading: process.env.company_name,
    },
    {
      heading: process.env.company_address,
    },
    {
      heading: `Vat Registered TIN:${process.env.tin}`,
    },
    {
      heading: `SN: ${process.env.serial_no} MIN:${process.env.min}`,
    },
    {
      heading: "",
    },
    {
      heading:
        sale.summary.net_amount > 0
          ? `O F F I C I A L   R E C E I P T`
          : "S A L E S   R E T U R N S",
    },
  ];

  content += columnify(data, {
    include: ["heading"],
    minWidth: FILE_WIDTH,
    align: "center",
    showHeaders: false,
  });

  content += "\n\n";
  content += `${"-".repeat(FILE_WIDTH)}\n`;

  if (sale.deleted && sale.deleted.datetime) {
    data = [
      {
        d: "VOIDED",
      },
      {
        d: `Voided by: ${sale.deleted.user && sale.deleted.user.name}`,
      },
      {
        d: moment(sale.deleted.datetime).format("lll"),
      },
    ];

    content += columnify(data, {
      include: ["d"],
      minWidth: FILE_WIDTH,
      align: "center",
      showHeaders: false,
    });

    content += "\n\n";
  }

  let sales_reference = "OR #";

  if (sale.summary.net_amount < 0) {
    sales_reference = "SR #";
  }

  data = [
    {
      label: "TIME :",
      value: moment(sale.datetime).format("LLLL"),
    },
    {
      label: `${sales_reference} :`,
      value: sale.sales_id.toString().padStart(12, "0"),
    },
    {
      label: "TRANS # : ",
      value: sale.trans_id.toString().padStart(12, "0"),
    },
    {
      label: "CASHIER : ",
      value: sale.user ? sale.user.name : "",
    },
  ];

  content += columnify(data, {
    include: ["label", "value"],
    maxWidth: FILE_WIDTH,
    showHeaders: false,
  });

  content += "\n";
  content += `${"-".repeat(FILE_WIDTH)}\n`;

  sale.items.forEach((item) => {
    data = [
      {
        name: `${item.product.name}`,
        amount: numberFormat(item.gross_amount),
      },
    ];

    content += columnify(data, {
      showHeaders: false,
      config: {
        name: {
          minWidth: FILE_WIDTH - 10 - 1,
        },
        amount: {
          minWidth: 10,
          align: "right",
        },
      },
    });

    content += "\n";

    content += `    ${item.quantity} @ ${numberFormat(item.product.price)}\n`;
    if (item.returns && item.returns.sales_id) {
      content += `    SI#${item.returns.sales_id}\n`;
    }
  });

  content += `${"-".repeat(50)}\n`;

  data = [
    {
      subtotal: "SUBTOTAL : ",
      items: `${sale.summary.no_of_items} ITEM(S)`,
      amount: numberFormat(round(sale.summary.net_of_returns)),
    },
  ];

  content +=
    columnify(data, {
      showHeaders: false,
      config: {
        subtotal: {
          minWidth: 10,
        },
        items: {
          minWidth: 10,
        },
        amount: {
          minWidth: FILE_WIDTH - 20 - 2,
          align: "right",
        },
      },
    }) + "\n";

  if (sale.summary.total_returns) {
    data = [
      {
        subtotal: "LESS RETURNS : ",
        amount: numberFormat(round(sale.summary.total_returns)),
      },
    ];

    content +=
      columnify(data, {
        showHeaders: false,
        config: {
          subtotal: {
            minWidth: 20,
          },
          amount: {
            minWidth: FILE_WIDTH - 20 - 1,
            align: "right",
          },
        },
      }) + "\n";
  }

  /* content += `${"-".repeat(50)}\n`; */

  if (
    sale.summary &&
    (sale.summary.less_vat > 0 || sale.summary.less_sc_disc)
  ) {
    data = [
      {
        label: "  LESS SC/PWD VAT DEDUCTION",
        value: numberFormat(round(sale.summary.less_vat)),
      },
      {
        label: "  LESS SC/PWD DISC",
        value: numberFormat(round(sale.summary.less_sc_disc)),
      },
    ];

    content +=
      columnify(data, {
        showHeaders: false,
        config: {
          label: {
            minWidth: FILE_WIDTH - 15 - 1,
          },
          value: {
            minWidth: 15,
            align: "right",
          },
        },
      }) + "\n";
  }

  if (sale.summary && sale.summary.discount_amount > 0) {
    data = [
      {
        label: "LESS DISC",
        value: numberFormat(round(sale.summary.discount_amount)),
      },
    ];

    content +=
      columnify(data, {
        showHeaders: false,
        config: {
          label: {
            minWidth: FILE_WIDTH - 15 - 1,
          },
          value: {
            minWidth: 15,
            align: "right",
          },
        },
      }) + "\n";
  }

  if (
    sale.payments &&
    sale.payments.credit_cards &&
    sale.payments.credit_cards.length > 0
  ) {
    content += `${"-".repeat(FILE_WIDTH)}\n`;

    sale.payments.credit_cards.forEach((o) => {
      data = [
        {
          label: `${o.credit_card.card}/${o.credit_card.card_number.substring(
            o.credit_card.card_number.length - 4
          )}`,
          value: numberFormat(o.credit_card.amount),
        },
      ];

      content +=
        columnify(data, {
          showHeaders: false,
          config: {
            label: {
              minWidth: FILE_WIDTH - 15 - 1,
            },
            value: {
              minWidth: 15,
              align: "right",
            },
          },
        }) + "\n";
    });
  }

  /* if (
    sale.payments &&
    sale.payments.gift_checks &&
    sale.payments.gift_checks.length > 0
  ) {
    content.concat(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    sale.payments.gift_checks.forEach(gift_check => {
      content.concat(
        `GC#${gift_check.items.gift_check_number.toString()}${
          escpos.CARRIAGE_RETURN
        }${escpos.ALIGN_RIGHT}(${numberFormat(gift_check.items.amount)})\n`
      );
      content.concat(escpos.ALIGN_LEFT);
    });
  }

  if (sale.payments && sale.payments.account) {
    content.concat(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
    content.concat(`ACCOUNT: ${sale.payments.account.name}\n`);
    content.concat(
      `${escpos.CARRIAGE_RETURN}${escpos.ALIGN_RIGHT}(${numberFormat(
        sale.payments.account.account_credit
      )})\n`
    );
    content.concat(escpos.ALIGN_LEFT);
  } */

  content += `${"-".repeat(FILE_WIDTH)}\n`;

  data = [
    {
      label: `AMOUNT DUE`,
      value: numberFormat(round(sale.summary.amount_due)),
    },
    {
      label: "CASH TENDERED",
      value: numberFormat(round(sale.summary.payment_amount)),
    },
    {
      label: "CHANGE",
      value: numberFormat(sale.summary.change),
    },
  ];

  content +=
    columnify(data, {
      showHeaders: false,
      config: {
        label: {
          minWidth: FILE_WIDTH - 15 - 1,
        },
        value: {
          minWidth: 15,
          align: "right",
        },
      },
    }) + "\n";

  content += `${"-".repeat(FILE_WIDTH)}\n`;

  data = [
    {
      label: `VATABLE SALES`,
      value: numberFormat(round(sale.summary.vatable_amount)),
    },
    {
      label: "VAT AMOUNT",
      value: numberFormat(round(sale.summary.vat_amount)),
    },
    {
      label: "VAT EXEMPT SALES",
      value: numberFormat(round(sale.summary.vat_exempt_amount)),
    },
    {
      label: "NON VAT SALES",
      value: numberFormat(round(sale.summary.non_vatable_amount)),
    },
    {
      label: "ZERO-RATED SALES",
      value: numberFormat(round(sale.summary.zero_rated_amount)),
    },
  ];

  content +=
    columnify(data, {
      showHeaders: false,
      config: {
        label: {
          minWidth: FILE_WIDTH - 15 - 1,
        },
        value: {
          minWidth: 15,
          align: "right",
        },
      },
    }) + "\n";

  content += `${"-".repeat(FILE_WIDTH)}\n`;

  if (seniors && seniors.length > 0) {
    content += "SC/PWD DISCOUNT DETAILS\n";

    seniors.forEach((senior) => {
      content += "\n\n\n\n";

      let data = [
        {
          d: "_".repeat(30),
        },
        {
          d: `[SC/PWD]${senior.name}`,
        },
        {
          d: `[OSACA/PWD ID]${senior.no}`,
        },
        {
          d: `[TIN]${senior.tin || ""}`,
        },
        {
          d: "",
        },
      ];

      content +=
        columnify(data, {
          minWidth: FILE_WIDTH,
          align: "center",
          showHeaders: false,
        }) + "\n";
    });
  }

  if (sale.summary.net_amount > 0) {
    data = [
      {
        d: "THIS SERVES AS YOUR OFFICIAL RECEIPT",
      },
    ];
  }

  content +=
    columnify(data, {
      minWidth: FILE_WIDTH,
      align: "center",
      showHeaders: false,
    }) + "\n";

  content += "\n";

  const customer_name = sale.customer ? sale.customer.customer_name : "";
  const customer_address = sale.customer ? sale.customer.address : "";
  const customer_business_style = sale.customer
    ? sale.customer.business_style
    : "";
  const customer_tin = sale.customer ? sale.customer.tin : "";

  data = [
    {
      label: "NAME :",
      value: customer_name,
    },
    {
      label: "ADDRESS :",
      value: customer_address,
    },
    {
      label: "TIN : ",
      value: customer_tin,
    },
    {
      label: "BUSINESS STYLE : ",
      value: customer_business_style,
    },
  ];

  content +=
    columnify(data, {
      showHeaders: false,
      config: {
        label: {
          minWidth: 20,
        },
        value: {
          minWidth: FILE_WIDTH - 20 - 1,
        },
      },
    }) + "\n\n";

  content += `${"=".repeat(FILE_WIDTH)}\n`;

  data = [
    {
      d: "MSALVIO SOFTWARE &",
    },
    {
      d: "HARDWARE TECHNOLOGIES",
    },
    {
      d: "BIG.D POS V 1.0",
    },
    {
      d: `L10 B4 Villa Socorro Subd.`,
    },
    {
      d: "Brgy. Taculing",
    },
    {
      d: "Bacolod City, Negros Occidental",
    },
    {
      d: `Vat Registered TIN:284-894-233-00000`,
    },
    {
      d: `Accred No.:${process.env.ACCRED_NO}`,
    },
    {
      d: `Accred Date : ${process.env.ACCRED_DATE}`,
    },
    {
      d: `Valid Until : ${process.env.ACCRED_VALID_UNTIL}`,
    },
    {
      d: `Permit No: ${process.env.PERMIT_NO}`,
    },
    {
      d: `Date Issued : ${process.env.PERMIT_DATE_ISSUED}`,
    },
    {
      d: `PTU Valid Until: ${process.env.PERMIT_VALID_UNTIL}`,
    },
    {
      d: "THIS RECEIPT SHALL BE VALID FOR FIVE(5) YEARS FROM THE DATE OF THE PERMIT TO USE",
    },
  ];

  content +=
    columnify(data, {
      include: ["d"],
      maxWidth: FILE_WIDTH,
      align: "center",
      showHeaders: false,
    }) + "\n";

  content += "\n\n\n\n";

  return content;
};

const getSeniorsFromSale = (sale, SalesModel = Sales) => {
  return new Promise((resolve, reject) => {
    SalesModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(sale._id),
        },
      },
      {
        $unwind: {
          path: "$items",
        },
      },
      {
        $unwind: {
          path: "$items.discount_detail.seniors",
        },
      },
      {
        $project: {
          senior: "$items.discount_detail.seniors",
        },
      },
      {
        $group: {
          _id: {
            no: "$senior.no",
            name: "$senior.name",
          },
        },
      },
      {
        $project: {
          no: "$_id.no",
          name: "$_id.name",
          tin: "$_id.tin",
        },
      },
    ])
      .then((seniors) => {
        resolve(seniors);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getSaleItems = (sale, SalesModel = Sales) => {
  return new Promise((resolve, reject) => {
    SalesModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(sale._id),
        },
      },
      {
        $unwind: {
          path: "$items",
        },
      },
      {
        $group: {
          _id: {
            product_id: "$items.product._id",
            price: "$items.product.price",
          },
          product: {
            $first: "items.product",
          },
          name: {
            $first: "$items.product.name",
          },
          price: {
            $first: "$items.product.price",
          },
          quantity: {
            $sum: "$items.quantity",
          },
          gross_amount: {
            $sum: "$items.gross_amount",
          },
        },
      },
      {
        $sort: {
          price: -1,
          name: 1,
        },
      },
    ])
      .then((records) => {
        resolve(records);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

module.exports = router;
