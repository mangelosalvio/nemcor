const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Sales = require("./../../models/Sales");
const SalesOtherSet = require("./../../models/SalesOtherSet");

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
  printDailySalesInventoryReport,
  printPhysicalCountForm,
  printSaleOut,
  printSuspendedSale,
} = require("../../utils/printing_functions");
const {
  saveXread,
  saveZread,
  updateZread,
  updateXread,
  getDaysFromDateRange,
  getLatestZreadOfTheDay,
} = require("../../library/sale_functions");
const XreadOtherSet = require("../../models/XreadOtherSet");
const ZreadOtherSet = require("../../models/ZreadOtherSet");
const {
  generateExcelAllSalesListings,
} = require("../../library/excel_functions");
const CashCount = require("../../models/CashCount");
const { getAccountBalance } = require("../../library/account_functions");
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const sortBy = require("lodash").sortBy;
const VirtualTable = require("../../models/VirtualTable");
const SuspendSale = require("../../models/SuspendSale");
const Product = require("../../models/Product");
const { result } = require("lodash");
const AccountCollection = require("../../models/AccountCollection");

const printer_escpos = require("escpos");
const {
  getReceiptFooter,
  getStoreWarehouse,
} = require("../../library/setting_functions");
const SalesOrder = require("../../models/SalesOrder");
const { saveToSalesOrder } = require("../../library/cashier_functions");
printer_escpos.USB = require("escpos-usb");
printer_escpos.Network = require("escpos-network");

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
                particulars: `OS#${sale.sales_id}`,
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

const printSale = (
  sale,
  { reprint = 0, SalesModel = Sales } = { reprint: 0, SalesModel: Sales }
) => {
  return new Promise(async (resolve, reject) => {
    try {
      try {
        if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
          device = new printer_escpos.Network(
            process.env.CASHIER_PRINTER_IP,
            9100
          );
        } else {
          device = new printer_escpos.USB(
            process.env.VENDOR_ID,
            process.env.PRODUCT_ID
          );
        }
      } catch (err) {
        console.log("Unable to connect to Epson Printer");
        return reject({ msg: "Unable to connect to Epson Printer" });
      }

      const printer = new printer_escpos.Printer(device);

      device?.open(async (printer_error) => {
        if (reprint === 0) {
          printer.print(escpos.OPEN_DRAWER_1);
          printer.print(escpos.OPEN_DRAWER_2);
        }

        printer.print(escpos.INITALIZE);
        printer.print(escpos.FONT_A);
        printer.print(escpos.ALIGN_CENTER);
        // printer.print(`${process.env.company_name}\n`);
        // printer.print(`${process.env.trade_name}\n`);
        // printer.print(`${process.env.company_address}\n`);
        // printer.print(`Vat Registered TIN:${process.env.tin}\n`);
        // printer.print(
        //   `SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`
        // );

        printer.print(`\n`);
        printer.print(`O R D E R   S L I P\n\n`);

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        if (reprint) {
          printer.print(escpos.EMPHASIZE);
          printer.print(escpos.ALIGN_CENTER);
          printer.print("REPRINT\n");
          printer.print(escpos.NORMAL);
          printer.print(escpos.FONT_B);
          printer.print(
            moment.tz(moment(), process.env.TIMEZONE).format("lll")
          );
          printer.print("\n\n");
        }

        printer.print(escpos.FONT_A);
        if (sale.deleted && sale.deleted.datetime) {
          printer.print(escpos.ALIGN_CENTER);
          printer.print(escpos.EMPHASIZE);
          printer.print(`VOIDED\n`);
          printer.print(escpos.NORMAL);
          printer.print(
            `Voided by: ${sale.deleted.user && sale.deleted.user.name}\n`
          );
          printer.print(moment(sale.deleted.datetime).format("lll"));
          printer.print("\n\n");
        }

        printer.print(escpos.ALIGN_LEFT);
        let sales_reference = "OS #";

        printer.print(escpos.INITALIZE);
        printer.print(`Time : ${moment(sale.datetime).format("LLL")}\n`);
        printer.print(
          `${sales_reference} : ${sale.sales_id.toString().padStart(12, "0")}\n`
        );
        printer.print(
          `TRANS # : ${sale.trans_id.toString().padStart(12, "0")}\n`
        );
        printer.print(`Cashier : ${sale.user && sale.user.name}\n`);
        printer.print(`Seller  : ${sale.seller?.name || ""}\n`);

        if (
          sale.tieup_information &&
          sale.tieup_information.tieup &&
          sale.tieup_information.tieup.name
        ) {
          printer.print(`Tie-up : ${sale.tieup_information.tieup.name}\n`);
          printer.print(
            `Booking Reference : ${sale.tieup_information.booking_reference}\n`
          );
        }

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        const sale_items = await getSaleItems(sale, SalesModel);

        await asyncForEach(sale_items, async (item) => {
          const item_name = `  ${item.sku} ${item.name}`;
          const item_amount = numberFormat(item.gross_amount);

          // printer.print(escpos.ALIGN_LEFT);
          // printer.print(
          //   `${item_name}${escpos.CARRIAGE_RETURN}${
          //     escpos.ALIGN_RIGHT
          //   }${numberFormat(item.gross_amount)}\n`
          // );

          let data = [
            {
              name: item_name,
              amount: item_amount,
            },
          ];

          printer.print(
            columnify(data, {
              showHeaders: false,
              config: {
                name: {
                  minWidth: FILE_WIDTH - 10 - 2,
                  maxWidth: FILE_WIDTH - 10 - 2,
                },
                amount: {
                  minWidth: 10,
                  align: "right",
                },
              },
            }) + "\n"
          );

          if (
            ((item.product.add_ons && item.product.add_ons) || []).length > 0
          ) {
            await async.eachSeries(item.product.add_ons, (add_on, cb) => {
              printer.print(`    +${add_on.product.name}\n`);

              cb(null);
            });
          }

          printer.print(escpos.ALIGN_LEFT);
          printer.print(
            `    ${item.quantity} @ ${numberFormat(
              item.gross_price || item.price
            )}\n`
          );

          /* if (item.returns && item.returns.sales_id) {
          printer.print(`    OS#${item.returns.sales_id} \n`);
        } */
        });

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        let label, amount, space;

        label = `${sale.summary.no_of_items} ITEM(S) `;
        amount = "";
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `SUBTOTAL:`;
        amount = numberFormat(round(sale.summary.net_of_returns));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `LESS RETURNS: `;
        amount = numberFormat(round(sale.summary.total_returns));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (sale.summary.total_returns > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        if (sale.summary && sale.summary.less_vat > 0) {
          label = `  LESS SC/PWD VAT DEDUCTION`;
          amount = numberFormat(round(sale.summary.less_vat));
          space = " ".repeat(
            process.env.LINE_MAX_CHAR - label.length - amount.length
          );
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);

          /* label = `  AMOUNT NET OF VAT`;
          amount = numberFormat(
            round(sale.summary.net_of_returns - sale.summary.less_vat)
          );
          space = " ".repeat(
            process.env.LINE_MAX_CHAR - label.length - amount.length
          );
          printer.print(`${label}${space}${amount}\n`);
  
          printer.print(escpos.ALIGN_LEFT); */
        }

        label = `  LESS SC/PWD DISC`;
        amount = numberFormat(round(sale.summary.less_sc_disc));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (sale.summary && sale.summary.less_sc_disc > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        label = `  LESS DISC`;
        amount = numberFormat(round(sale.summary.discount_amount));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (sale.summary && sale.summary.discount_amount > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        if (
          sale.payments &&
          sale.payments.credit_cards &&
          sale.payments.credit_cards.length > 0
        ) {
          sale.payments.credit_cards.forEach((o) => {
            label = `${
              o.credit_card.card
            }/${o.credit_card.card_number.substring(
              o.credit_card.card_number.length - 4
            )}`;
            amount = numberFormat(0 - o.credit_card.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          sale.payments &&
          sale.payments.checks &&
          sale.payments.checks.length > 0
        ) {
          sale.payments.checks.forEach((o) => {
            label = `CK:${o.bank}/${o.check_no}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          sale.payments &&
          sale.payments.free_of_charge_payments &&
          sale.payments.free_of_charge_payments.length > 0
        ) {
          sale.payments.free_of_charge_payments.forEach((o) => {
            label = `F.O.C.:${o.name}/${o.remarks}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          sale.payments &&
          sale.payments.online_payments &&
          sale.payments.online_payments.length > 0
        ) {
          sale.payments.online_payments.forEach((o) => {
            label = `Online:${o.depository}/${o.reference}`;
            amount = numberFormat(0 - o.amount);

            let data = [
              {
                name: label,
                amount,
              },
            ];

            printer.print(
              columnify(data, {
                showHeaders: false,
                config: {
                  name: {
                    minWidth: FILE_WIDTH - 10 - 1,
                    maxWidth: FILE_WIDTH - 10 - 1,
                  },
                  amount: {
                    minWidth: 10,
                    align: "right",
                  },
                },
              }) + "\n"
            );
          });
        }

        if (
          sale.payments &&
          sale.payments.charge_to_accounts &&
          sale.payments.charge_to_accounts.length > 0
        ) {
          await asyncForEach(sale.payments.charge_to_accounts, async (o) => {
            const { balance } = await getAccountBalance({
              _id: o.account._id,
            });

            const label = `Charge:${o.account.name}\nBal: ${numberFormat(
              balance
            )}`;
            const amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          sale.payments &&
          sale.payments.gift_checks &&
          sale.payments.gift_checks.length > 0
        ) {
          sale.payments.gift_checks.forEach((o) => {
            label = `GC:${o.gift_check.items.gift_check_number}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        label = `AMOUNT DUE`;
        amount = numberFormat(round(sale.summary.amount_due));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `CASH TENDERED`;
        amount = numberFormat(round(sale.summary.payment_amount));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );
        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `CHANGE`;
        amount = numberFormat(sale.summary.change);

        space = " ".repeat(
          (process.env.LINE_MAX_CHAR - label.length * 2 - amount.length * 2) / 2
        );

        printer.print(escpos.EMPHASIZE);
        printer.print(`${label}${space}${amount}\n`);

        printer.print(escpos.NORMAL);

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        printer.print(
          printLabelAmountFormat({
            label: `VATABLE SALES`,
            amount: sale.summary.vatable_amount,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `VAT AMOUNT`,
            amount: sale.summary.vat_amount,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `VAT EXEMPT SALES`,
            amount: sale.summary.vat_exempt_amount,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `NON VAT SALES`,
            amount: sale.summary.non_vatable_amount,
          })
        );

        printer.print(
          printLabelAmountFormat({
            label: `ZERO-RATED SALES`,
            amount: sale.summary.zero_rated_amount,
          })
        );

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        printer.print(escpos.ALIGN_LEFT);
        printer.print(escpos.INITALIZE);

        /**
         * senior details here
         */

        const seniors = await getSeniorsFromSale(sale, SalesModel);

        if (seniors.length > 0) {
          printer.print("SC/PWD  DETAILS\n");
          printer.print(escpos.ALIGN_CENTER);

          seniors.forEach((senior) => {
            printer.print("\n\n\n\n");
            printer.print(`${"_".repeat(30)}\n`);
            printer.print(
              `[SC/PWD]${senior.name}\n[OSACA/PWD ID]${senior.no}\n`
            );
          });
          printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
        }

        if (sale.summary.net_amount > 0) {
          printer.print(escpos.ALIGN_CENTER);
          printer.print("\n");
          printer.print(escpos.BOLD);
          printer.print("THIS IS NOT YOUR SALES INVOICE\n\n");
          printer.print("THIS DOCUMENT IS NOT VALID\nFOR CLAIM OF INPUT TAX\n");
          printer.print(escpos.BOLD_OFF);
          printer.print("\n");
          printer.print(escpos.ALIGN_LEFT);
        }

        const name_label = "NAME : ";
        const address_label = "ADDRESS : ";
        const tin_label = "TIN : ";
        const business_style_label = "BUSINESS STYLE : ";

        const customer_name = sale.customer ? sale.customer.customer_name : "";
        const customer_address = sale.customer ? sale.customer.address : "";
        const customer_business_style = sale.customer
          ? sale.customer.business_style
          : "";
        const customer_tin = sale.customer ? sale.customer.tin : "";
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

        /*  printer.print("\n\n");
        printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(
          "POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n"
        );
        printer.print("BIG.D POS V 1.0\n");
        printer.print(`L10 B4 Villa Socorro Subd.\nBrgy. Taculing\n`);
        printer.print(`Bacolod City, Negros Occidental\n`);
        printer.print(`Vat Registered TIN:284-894-233-00000\n`);
        printer.print(`Accred No.:${process.env.ACCRED_NO}\n`);
        printer.print(`Accred Date : ${process.env.ACCRED_DATE}\n`);
        printer.print(`Valid Until : ${process.env.ACCRED_VALID_UNTIL}\n`);
        printer.print(`Permit No:${process.env.PERMIT_NO}\n`);
        printer.print(`Date Issued : ${process.env.PERMIT_DATE_ISSUED}\n`);
        printer.print(`PTU Valid Until:${process.env.PERMIT_VALID_UNTIL}\n\n`); */

        /* printer.print(escpos.BOLD);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`${"*".repeat(process.env.LINE_MAX_CHAR)}\n`);
        printer.print("ANOTHER WAY TO ORDER!\n");
        printer.print("Call us at (034) 434-4045\n");
        printer.print("WE DELIVER\n");
        printer.print(`${"*".repeat(process.env.LINE_MAX_CHAR)}\n\n`); */

        const receipt_footer = await getReceiptFooter();
        printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(receipt_footer);

        /*         printer.print(
          "THIS RECEIPT SHALL BE VALID FOR FIVE(5) YEARS\nFROM THE DATE OF THE PERMIT TO USE\n"
        ); */

        printer.print("\n\n\n\n\n\n");
        printer.print(escpos.CUT);
        printer.close();
      });

      resolve({ success: 1 });
    } catch (err) {
      console.log(err);
      reject({ message: err });
    }
  });
};

router.post("/get-xreads", async (req, res) => {
  const date = moment(req.body.date);
  Xread.find({
    from_datetime: {
      $gte: date.clone().startOf("day").toDate(),
      $lte: date.clone().endOf("day").toDate(),
    },
  })
    .lean()
    .then((records) => {
      const _records = records.map((o) => {
        return {
          ...o,
          display_name: `${moment(o.from_datetime).format(
            "hh:mm A"
          )} - ${moment(o.to_datetime).format("hh:mm A")}`,
        };
      });
      res.json(_records);
    })
    .catch((err) => res.status(401).json(err));
});

router.post("/daily-sales-inventory-report", async (req, res) => {
  let SalesModel;
  let user = req.body.user;
  let input = req.body.input;

  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: isEmpty(input)
        ? moment().toDate()
        : moment(input, "MM/DD/YYYY").toDate(),
      to_date: isEmpty(input)
        ? moment().toDate()
        : moment(input, "MM/DD/YYYY").toDate(),
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
          $first: "$items.product",
        },
        total_quantity: {
          $sum: "$items.quantity",
        },
        net_sales: {
          $sum: "$items.net_amount",
        },
        gross_sales: {
          $sum: "$items.gross_amount",
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
        "product.sku": 1,
      },
    },
    // {
    //   $group: {
    //     _id: "$product.category._id",
    //     category: {
    //       $first: "$product.category",
    //     },
    //     items: {
    //       $push: "$$ROOT",
    //     },
    //   },
    // },
    // {
    //   $sort: {
    //     "category.name": 1,
    //   },
    // },
  ])
    .allowDiskUse(true)
    .then((records) => {
      printDailySalesInventoryReport({
        records,
        from_datetime,
        to_datetime,
        user,
      });

      return res.json({ records, from_datetime, to_datetime });
    });
});

router.post("/physical-count-form", async (req, res) => {
  let user = req.body.user;
  let input = req.body.input;

  Product.aggregate([
    {
      $match: {
        "category.is_in_pc_form": true,
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
    {
      $group: {
        _id: "$category._id",
        category: {
          $first: "$category",
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        "category.name": 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => {
      printPhysicalCountForm({
        records,
      });

      return res.json({ records });
    });
});

router.post("/zread-range", async (req, res) => {
  const period_covered = req.body.dates;
  const user = req.body.user;
  const other_set = req.body.other_set || false;

  const dates = await getDaysFromDateRange({ period_covered });

  async.eachSeries(dates, (date, cb) => {
    saveZread({
      other_set,
      user,
      time: date[0],
    }).then(({ zread }) => {
      if (zread) {
        printZread({ ...zread });
        trackZread(zread);
      }
    });
    cb(null);
  });

  return res.json({ success: 1 });
});

router.post("/accounts", (req, res) => {
  let SalesModel;
  const other_set = req.body.is_other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const account = req.body.account;

  SalesModel.aggregate([
    [
      {
        $match: {
          "payments.charge_to_accounts.account._id": ObjectId(account._id),
        },
      },
      {
        $unwind: {
          path: "$payments.charge_to_accounts",
        },
      },
      {
        $project: {
          sales: {
            sales_id: "$sales_id",
            datetime: "$datetime",
          },
          charge_to_account: "$payments.charge_to_accounts",
          net_amount: {
            $ifNull: [
              "$payments.charge_to_accounts.balance",
              "$payments.charge_to_accounts.amount",
            ],
          },
          payment_amount: {
            $ifNull: [
              "$payments.charge_to_accounts.balance",
              "$payments.charge_to_accounts.amount",
            ],
          },
        },
      },
      {
        $match: {
          $or: [
            {
              "charge_to_account.balance": {
                $exists: false,
              },
            },
            {
              "charge_to_account.balance": {
                $gt: 0,
              },
            },
          ],
        },
      },
    ],
  ])
    .allowDiskUse(true)
    .then((sales) => res.json(sales));
});

router.post("/discounted-sales", async (req, res) => {
  let SalesModel;
  let ZreadModel;
  const other_set = req.body.other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
    ZreadModel = ZreadOtherSet;
  } else {
    SalesModel = Sales;
    ZreadModel = Zread;
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
          $or: [
            {
              "summary.less_sc_disc": {
                $gt: 0,
              },
            },
            {
              "summary.discount_amount": {
                $gt: 0,
              },
            },
          ],
        }).exec(cb);
      },

      latest_zread: (cb) => {
        ZreadModel.findOne({}, { to_sales_id: 1 })
          .sort({ to_sales_id: -1 })
          .limit(1)
          .exec(cb);
      },
    },
    async (err, result) => {
      const form_data = { ...result };

      const async_sales = form_data.sales.map(async (sale) => {
        const discount_detail = await getDiscountDetailsFromSale({
          sale,
          SalesModel,
        });

        return {
          ...sale.toObject(),
          discount_detail: discount_detail[0] || null,
        };
      });

      const sales = await Promise.all(async_sales);

      return res.json({
        ...result,
        sales,
        from_datetime,
        to_datetime,
      });
    }
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
        ])
          .allowDiskUse(true)
          .exec(cb);
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
  ])
    .allowDiskUse(true)
    .then((records) => {
      return res.json({
        records,
        from_datetime,
        to_datetime,
      });
    });
});

router.post("/all-sales-listings", async (req, res) => {
  const is_excel = req.body.is_excel;

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
    async (err, result) => {
      if (is_excel) {
        const filename = await generateExcelAllSalesListings({
          records: result.sales,
          res,
        });
      } else {
        return res.json({ ...result, from_datetime, to_datetime });
      }
    }
  );
});

router.post("/foc-sales-report", async (req, res) => {
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
        "payments.free_of_charge_payments": {
          $elemMatch: {
            $exists: true,
          },
        },
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
        name: "$payments.free_of_charge_payments.name",
        remarks: "$payments.free_of_charge_payments.remarks",
        amount: "$payments.free_of_charge_payments.amount",
        user: "$payments.free_of_charge_payments.user",
        authorized_by: "$payments.free_of_charge_payments.authorized_by",
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json({ records, from_datetime, to_datetime }));
});

router.post("/cash-count-report", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  CashCount.aggregate([
    {
      $match: {
        date: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
        deleted: {
          $exists: false,
        },
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => {
      async.map(
        records,
        async (record) => {
          const zread = await getLatestZreadOfTheDay(record.date);

          return {
            ...record,
            zread,
          };
        },
        (err, results) => {
          return res.json({ records: results, from_datetime, to_datetime });
        }
      );
    });
});

router.post("/shift-sales-report", async (req, res) => {
  let SalesModel;

  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { from_datetime, to_datetime } = req.body;

  SalesModel.aggregate([
    {
      $match: {
        datetime: {
          $gte: moment(from_datetime).toDate(),
          $lte: moment(to_datetime).toDate(),
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
        gross_sales: {
          $sum: "$items.gross_amount",
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
  ])
    .allowDiskUse(true)
    .then((records) => res.json({ records, from_datetime, to_datetime }));
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
        gross_sales: {
          $sum: "$items.gross_amount",
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
  ])
    .allowDiskUse(true)
    .then((records) => res.json({ records, from_datetime, to_datetime }));
});

router.post("/category-sales-detailed-report", async (req, res) => {
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
        stock: { $first: "$items.product" },
        quantity: { $sum: "$items.quantity" },
        gross_amount: { $sum: "$items.gross_amount" },
        net_amount: { $sum: "$items.net_amount" },
        vatable_amount: { $sum: "$items.vatable_amount" },
        vat_exempt_amount: { $sum: "$items.vat_exempt_amount" },
      },
    },
    {
      $sort: {
        "stock.name": 1,
      },
    },
    {
      $group: {
        _id: "$stock.category._id",
        category: {
          $first: "$stock.category",
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        "category.name": 1,
      },
    },
    {
      $group: {
        _id: "$category.main_category",
        main_category: {
          $first: "$category.main_category",
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $sort: {
        main_category: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json({ records, from_datetime, to_datetime }));
});

router.post("/category-sales-report", async (req, res) => {
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
        _id: "$items.product.category.main_category",
        category: {
          $first: "$items.product.category.main_category",
        },
        total_quantity: {
          $sum: "$items.quantity",
        },
        net_sales: {
          $sum: "$items.net_amount",
        },
        gross_sales: {
          $sum: "$items.gross_amount",
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
        category: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json({ records, from_datetime, to_datetime }));
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
    return res.status(401).json(err);
  }
});

router.post("/consolidated-net-sales-report", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  try {
    const records = await report_functions.getConsolidatedSalesByDay({
      from_datetime,
      to_datetime,
    });
    return res.json({ records });
  } catch (err) {
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
      ])
        .allowDiskUse(true)
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
          net_of_vat: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].net_of_vat) || 0
          ),

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

router.post("/online-payments-report", async (req, res) => {
  let SalesModel;
  const other_set = req.body.other_set || false;
  if (other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

  const { depository, reference } = req.body;

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
        "payments.online_payments": {
          $elemMatch: {
            $exists: true,
          },
        },
      },
    },
    {
      $unwind: {
        path: "$payments.online_payments",
      },
    },
    {
      $match: {
        ...(!isEmpty(depository) && {
          "payments.online_payments.depository": {
            $regex: new RegExp(depository, "i"),
          },
        }),
        ...(!isEmpty(reference) && {
          "payments.online_payments.reference": {
            $regex: new RegExp(reference, "i"),
          },
        }),
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json(records));
});

router.post("/charge-to-accounts-report", async (req, res) => {
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
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
        deleted: {
          $exists: false,
        },
        "payments.charge_to_accounts": {
          $elemMatch: {
            $exists: true,
          },
        },
      },
    },
    {
      $unwind: {
        path: "$payments.charge_to_accounts",
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json(records));
});

router.post("/tieup-report", async (req, res) => {
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
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
        deleted: {
          $exists: false,
        },
        "tieup_information.tieup.name": {
          $exists: true,
        },
        ...(req.body.tieup && {
          "tieup_information.tieup._id": mongoose.Types.ObjectId(
            req.body.tieup._id
          ),
        }),
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => res.json(records));
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
          net_of_vat: sumBy(
            products,
            (o) =>
              (o.product_data[index] && o.product_data[index].net_of_vat) || 0
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
  saveXread({
    other_set: false,
    user: req.body.user,
    time: moment(),
  })
    .then(({ xread }) => {
      printXread({ ...xread });
      // printSaleOut({
      //   user: req.body.user,
      //   from_datetime: xread.from_datetime,
      //   to_datetime: xread.to_datetime,
      // });
      trackXread(xread);
      return res.json(xread);
    })
    .catch((err) => {
      return res.status(401).json(err);
    });
});

router.post("/xread-reprint", (req, res) => {
  const xread_id = req.body.xread_id;
  const other_set = req.body.other_set || false;

  let XreadModel = Xread;

  if (other_set) {
    XreadModel = XreadOtherSet;
  }

  XreadModel.findOne({
    xread_id,
  }).then((xread) => {
    /* trackXread(xread, { reprint: 1 }); */
    if (xread) {
      printXread(xread.toObject(), {
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

  const other_set = req.body.other_set || false;

  let XreadModel = Xread;

  if (other_set) {
    XreadModel = XreadOtherSet;
  }

  XreadModel.find({
    transaction_date: {
      $gte: from_date.startOf("day").toDate(),
      $lte: to_date.endOf("day").toDate(),
    },
  }).then(async (records) => {
    await asyncForEach([...records], async (record) => {
      /* if (!other_set) {
        trackXread(record, { reprint: 1 });
      } */

      printXread(record, {
        reprint: 1,
      });
      await report_functions.sleep(1000);
    });

    return res.json({ success: 1 });
  });
});

router.post("/credit-cards", async (req, res) => {
  const card_type = req.body.card_type || constants.CREDIT;

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
          $exists: false,
        },
        datetime: {
          $gte: from_datetime.toDate(),
          $lte: to_datetime.toDate(),
        },
        "payments.credit_cards": {
          $exists: true,
          $ne: [],
        },
      },
    },
    {
      $unwind: {
        path: "$payments.credit_cards",
      },
    },
    {
      $match: {
        "payments.credit_cards.credit_card.card_type": card_type,
      },
    },
    {
      $sort: {
        datetime: 1,
      },
    },
  ])
    .allowDiskUse(true)
    .then((records) => {
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
  ])
    .allowDiskUse(true)
    .then((records) => {
      return res.json(records);
    });
});

router.post("/reprint/cash-count", (req, res) => {
  const id = req.body._id;
  CashCount.findOne({
    _id: mongoose.Types.ObjectId(id),
  }).then((record) => {
    printCashCount(record.toObject());

    return res.json({ success: 1 });
  });
});

router.post("/reprint/latest", (req, res) => {
  let input = req.body.input;
  let SalesModel = Sales;

  let other_set = false;
  if (input.includes("b") || input.includes("B")) {
    SalesModel = SalesOtherSet;
    other_set = true;
  }

  SalesModel.findOne({}, {}, { sort: { _id: -1 } }).then((sale) => {
    if (sale) {
      if (!other_set) {
        trackSale(sale, {
          reprint: true,
        });
      }

      printSale(sale, {
        reprint: 1,
        SalesModel,
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
  let input = req.params.id;
  let SalesModel = Sales;

  let other_set = false;

  if (input.includes("B") || input.includes("b")) {
    other_set = true;
    SalesModel = SalesOtherSet;
  }

  input = input || "";

  input = input.replace("b", "");
  input = input.replace("B", "");

  /* let Model = Sales;

  if (parseInt(req.params.id) < 0) {
    Model = SalesReturns;
  } */

  SalesModel.findOne({
    sales_id: Math.abs(parseInt(req.params.id)),
  }).then((sale) => {
    if (sale) {
      if (sale.summary.net_amount < 0) {
        if (!other_set) {
          trackSalesReturn(sale, {
            reprint: true,
          });
        }
      } else {
        if (!other_set) {
          trackSale(sale, {
            reprint: true,
          });
        }
      }

      printSale(sale, { reprint: 1, SalesModel })
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
  let other_set = req.body.other_set || false;

  if (other_set) {
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

    if (!other_set) {
      trackSale(sale, {
        reprint: true,
      });
    }

    return res.json({ success: 1 });
  });
});

router.post("/zread-reprint", (req, res) => {
  const zread_id = req.body.zread_id;
  const other_set = req.body.other_set || false;

  let ZreadModel = Zread;

  if (other_set) {
    ZreadModel = ZreadOtherSet;
  }

  ZreadModel.findOne({
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

  const other_set = req.body.other_set || false;

  let ZreadModel = Zread;

  if (other_set) {
    ZreadModel = ZreadOtherSet;
  }

  ZreadModel.find({
    from_datetime: {
      $gte: from_date.startOf("day").toDate(),
      $lte: to_date.endOf("day").toDate(),
    },
  }).then(async (records) => {
    await asyncForEach([...records], async (zread) => {
      printZread(zread, {
        reprint: 1,
      });
      /* if (!other_set) {
        trackZread(zread, {
          reprint: true,
        });
      } */

      await report_functions.sleep(1000);
    });

    return res.json({ success: 1 });
  });
});

router.post("/zread-summary", async (req, res) => {
  const dates = req.body.dates;
  const from_date = moment(dates[0]);
  const to_date = moment(dates[1]);

  const other_set = req.body.other_set || false;

  let ZreadModel = Zread;

  if (other_set) {
    ZreadModel = ZreadOtherSet;
  }

  const { start_time } = await report_functions.getStoreHours(
    from_date.toDate()
  );

  const { end_time } = await report_functions.getStoreHours(to_date.toDate());

  ZreadModel.aggregate([
    {
      $match: {
        from_datetime: {
          $gte: start_time.clone().toDate(),
          $lte: end_time.clone().toDate(),
        },
        deleted: {
          $exists: false,
        },
      },
    },
    {
      $group: {
        _id: null,
        from_datetime: {
          $min: "$from_datetime",
        },
        to_datetime: {
          $max: "$to_datetime",
        },
        from_sales_id: {
          $min: "$from_sales_id",
        },
        to_sales_id: {
          $max: "$to_sales_id",
        },
        old_grand_total_sales: {
          $min: "$old_grand_total_sales",
        },
        new_grand_total_sales: {
          $max: "$new_grand_total_sales",
        },

        net_of_void_gross_amount: {
          $sum: "$net_of_void.gross_amount",
        },
        net_of_void_total_returns: {
          $sum: "$net_of_void.total_returns",
        },
        net_of_void_net_of_returns: {
          $sum: "$net_of_void.net_of_returns",
        },
        net_of_void_less_vat: {
          $sum: "$net_of_void.less_vat",
        },
        net_of_void_less_sc_disc: {
          $sum: "$net_of_void.less_sc_disc",
        },
        net_of_void_less_disc: {
          $sum: "$net_of_void.less_disc",
        },
        net_of_void_net_amount: {
          $sum: "$net_of_void.net_amount",
        },

        number_of_voided_invoices: {
          $sum: "$number_of_voided_invoices",
        },

        gross_amount: {
          $sum: "$gross_amount",
        },
        total_returns: {
          $sum: "$total_returns",
        },
        net_of_returns: {
          $sum: "$net_of_returns",
        },
        less_vat: {
          $sum: "$less_vat",
        },
        less_sc_disc: {
          $sum: "$less_sc_disc",
        },
        less_disc: {
          $sum: "$less_disc",
        },
        voided_sales: {
          $sum: "$voided_sales",
        },
        net_amount: {
          $sum: "$net_amount",
        },
        vat_sales: {
          $sum: "$vat_sales",
        },
        vat_exempt: {
          $sum: "$vat_exempt",
        },
        vat_amount: {
          $sum: "$vat_amount",
        },
        non_vat_amount: {
          $sum: "$non_vat_amount",
        },

        check_sales: {
          $sum: "$check_sales",
        },
        free_of_charge_sales: {
          $sum: "$free_of_charge_sales",
        },
        online_payment_sales: {
          $sum: "$online_payment_sales",
        },
        gift_check_sales: {
          $sum: "$gift_check_sales",
        },
        charge_to_account_sales: {
          $sum: "$charge_to_account_sales",
        },
        credit_card_sales: {
          $sum: "$credit_card_sales",
        },
        cash_sales: {
          $sum: "$cash_sales",
        },
      },
    },
  ])
    .allowDiskUse(true)
    .then(async (records) => {
      if (records && records.length > 0) {
        printZreadSummary({ ...records[0] });
      }

      return res.json({ success: 1 });
    })
    .catch((err) => res.status(401).json(err));
});

/**
 * return
 *  TRUE - ZREAD is found
 * FALSE - ZREAd not found
 */

router.post("/has-zread", async (req, res) => {
  const now = moment.tz(moment(), process.env.TIMEZONE);

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
     * closing is with in the same day (early closing)
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
    .lean(true)
    .then((zread) => {
      const status = zread ? true : false;
      return res.json({ status });
    })
    .catch((err) => {
      console.log(err);
      return res.status(401).json(err);
    });
});

router.post("/zread", async (req, res) => {
  saveZread({
    other_set: false,
    user: req.body.user,
    time: moment(),
  }).then(({ zread }) => {
    printZread({ ...zread });
    trackZread(zread);
    return res.json(zread);
  });
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
  ])
    .allowDiskUse(true)
    .then((records) => {
      return res.json(records);
    });
});

router.post("/sales", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  const other_set = req.body.other_set || false;
  let SalesModel = Sales;

  if (other_set) {
    SalesModel = SalesOtherSet;
  }

  SalesModel.aggregate([
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
  ])
    .allowDiskUse(true)
    .then((records) => {
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
  ])
    .allowDiskUse(true)
    .then((records) => {
      return res.json(records);
    });
});

router.post("/zread-listings", (req, res) => {
  const other_set = req.body.other_set || false;
  let ZreadModel = Zread;

  if (other_set) {
    ZreadModel = ZreadOtherSet;
  }

  ZreadModel.aggregate([
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
  ])
    .allowDiskUse(true)
    .then((records) => {
      return res.json(records);
    });
});

router.post("/xread-listings", async (req, res) => {
  const other_set = req.body.other_set || false;

  let XreadModel = Xread;
  if (other_set) {
    XreadModel = XreadOtherSet;
  }

  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  XreadModel.aggregate([
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
  ])
    .allowDiskUse(true)
    .then((records) => {
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
  ])
    .allowDiskUse(true)
    .then((records) => {
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

  let SalesModel;

  if (req.body.other_set) {
    SalesModel = SalesOtherSet;
  } else {
    SalesModel = Sales;
  }

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

  async.parallel(
    {
      summary: (cb) => {
        SalesModel.aggregate([
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
        ])
          .allowDiskUse(true)
          .exec(cb);
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

router.get("/update-zreads", async (req, res) => {
  await async.each([false, true], async (other_set, other_set_cb) => {
    let ZreadModel = Zread;
    if (other_set) {
      ZreadModel = ZreadOtherSet;
    }

    let zreads = await ZreadModel.find();

    await async.each(zreads, async (zread, cb) => {
      await updateZread({ other_set, zread });

      cb(null);
    });
    other_set_cb(null);
  });

  return res.json({ success: 1 });
});

router.get("/update-xreads", async (req, res) => {
  await async.each([false, true], async (other_set, other_set_cb) => {
    let XreadModel = Xread;
    if (other_set) {
      XreadModel = XreadOtherSet;
    }

    let records = await XreadModel.find();

    await async.each(records, async (xread, cb) => {
      await updateXread({ other_set, xread });
      cb(null);
    });
    other_set_cb(null);
  });

  return res.json({ success: 1 });
});

router.get("/update-vat-amount", async (req, res) => {
  let SalesModels = [Sales, SalesOtherSet];
  await async.each(SalesModels, async (SalesModel, sales_cb) => {
    let sales = await SalesModel.find();

    await async.each(sales, async (sale, cb) => {
      const vatable_amount = sale.summary.vatable_amount;
      const vat_amount = round(vatable_amount * 0.12);

      await SalesModel.updateOne(
        {
          _id: sale._id,
        },
        {
          $set: {
            "summary.vat_amount": vat_amount,
          },
        }
      ).exec();

      cb(null);
    });
    sales_cb(null);
  });

  let SummaryModels = [Xread, Zread, XreadOtherSet, ZreadOtherSet];

  await async.each(SummaryModels, async (Model, model_callback) => {
    let records = await Model.find();
    await async.each(records, async (record, cb) => {
      const vat_sales = record.vat_sales;
      const vat_amount = round(vat_sales * 0.12);

      await Model.updateOne(
        {
          _id: record._id,
        },
        {
          $set: {
            vat_amount: vat_amount,
          },
        }
      ).exec();

      cb(null);
    });
    model_callback(null);
  });

  return res.json({ success: 1 });
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
  ])
    .allowDiskUse(true)
    .then((result) => res.json(result));
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
  ])
    .allowDiskUse(true)
    .then((result) => res.json(result));
});

router.get("/invoices", (req, res) => {
  Sales.find({
    datetime: {
      $gte: req.query.startDate,
      $lte: req.query.endDate,
    },
  })
    .then((sales) => res.json(sales))
    .catch((err) => res.status(401).json(err));
});

router.get("/suspended-sales", (req, res) => {
  SuspendSale.find({
    deleted: {
      $exists: false,
    },
  })
    .sort({ _id: 1 })
    .then((record) => {
      return res.json(record);
    })
    .catch((err) => res.status(401).json(err));
});

router.get("/:queue_no/sales-order", (req, res) => {
  const queue_no = req.params.queue_no;
  SalesOrder.findOne({
    deleted: {
      $exists: false,
    },
    queue_no,
  })
    .sort({
      _id: -1,
    })
    .then((record) => res.json(record))
    .catch((err) => res.status(401).json(err));
});

router.get("/:reference/suspended-sale-reference", (req, res) => {
  SuspendSale.findOne({
    deleted: {
      $exists: false,
    },
    // reference: req.params.reference,
    queue_no: req.params.reference,
  })
    .sort({ _id: -1 })
    .then((record) => {
      return res.json(record);
    });
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
    .catch((err) => res.status(401).json(err));
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
    .catch((err) => res.status(401).json(err));
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
    .catch((err) => res.status(401).json(err));
});

router.put("/sales-order", (req, res) => {
  saveToSalesOrder({ order: req.body });

  return res.json(true);
});

router.put("/cash-count", (req, res) => {
  const { items, total_amount, user } = req.body;

  Counter.increment("cash_count_id").then(({ next }) => {
    const cash_count = new CashCount({
      date: moment().toDate(),
      cash_count_id: next,
      user,
      items,
      total_amount,
    });

    cash_count
      .save()
      .then((record) => {
        printCashCount(record.toObject());
        return res.json(record);
      })
      .catch((err) => res.status(401).json(err));
  });
});

router.put("/bill", (req, res) => {
  let Model = VirtualTable;

  /**
   * double check if there are items
   */
  if (req.body.items.length <= 0) {
    return res.status(401).json({ msg: "No items" });
  }

  const sale = {
    datetime: moment.tz(process.env.TIMEZONE).toDate(),
    items: req.body.items,
    customer: req.body.customer,
    summary: req.body.summary,
    payments: req.body.payments,
    user: req.body.user,
    is_senior: req.body.is_senior,
    tieup_information: req.body.tieup_information,
  };

  const newSale = new Model(sale);

  //console.log(req.body.items)
  newSale.save().then(async (record) => {
    //console.log(record.items)
    //clear table here
    /* deductInventoryFromSales(Sale); */

    printBill(
      { ...record.toObject() },
      {
        reprint: 0,
        SalesModel: Model,
      }
    ).catch((err) => {
      console.log(err);
      console.log("Unable to Print in receipt printer");
    });

    return res.json({ success: 1 });
  });
});

router.put("/suspend-sale", async (req, res) => {
  let Model = SuspendSale;

  /**
   * double check if there are items
   */
  if (req.body.items.length <= 0) {
    return res.status(401).json({ msg: "No items" });
  }

  const queue_no = req.body.queue_no;
  const seller = req.body.seller;
  let reference;

  if (!isEmpty(queue_no)) {
    reference = queue_no;
  } else {
    const { next } = await Counter.increment("suspend_sale_ref");
    reference = next;
  }

  const sale = {
    reference,
    datetime: moment.tz(process.env.TIMEZONE).toDate(),
    items: req.body.items,
    customer: req.body.customer,
    summary: req.body.summary,
    payments: req.body.payments,
    user: req.body.user,
    seller,
    queue_no,
  };

  const newSale = new Model(sale);

  newSale.save().then(async (record) => {
    printSuspendedSale({
      _id: record._id,
      SalesModel: SuspendSale,
    });
    return res.json({ success: 1 });
  });
});

router.put("/order-slip", (req, res) => {
  let Model = VirtualTable;

  /**
   * double check if there are items
   */
  if (req.body.items.length <= 0) {
    return res.status(401).json({ msg: "No items" });
  }

  const sale = {
    datetime: moment.tz(process.env.TIMEZONE).toDate(),
    items: req.body.items,
    customer: req.body.customer,
    summary: req.body.summary,
    payments: req.body.payments,
    user: req.body.user,
    is_senior: req.body.is_senior,
    tieup_information: req.body.tieup_information,
  };

  const newSale = new Model(sale);

  newSale.save().then(async (record) => {
    VirtualTable.aggregate([
      {
        $match: {
          _id: record._id,
        },
      },
      {
        $unwind: {
          path: "$items",
        },
      },
      {
        $match: {
          "items.product.category.station": {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $project: {
          item: "$items",
        },
      },
      {
        $group: {
          _id: "$item.product.category.station.name",
          station: {
            $first: "$item.product.category.station",
          },
          station_orders: {
            $push: "$item",
          },
        },
      },
      {
        $match: {
          _id: {
            $ne: null,
          },
        },
      },
    ])
      .allowDiskUse(true)
      .then((stations) => {
        printOrderSlip({ stations });
      })
      .catch((err) => console.log(err));

    return res.json({ success: 1 });
  });
});

router.put("/", (req, res) => {
  let Model = Sales;
  let trans = "sales";
  const table = req.body.table || null;
  const other_set = (table && table.is_other_set) || false;

  if (other_set) {
    CounterModel = CounterOtherSet;
    Model = SalesOtherSet;
  } else {
    CounterModel = Counter;
    Model = Sales;
  }

  if (req.body.summary.net_amount < 0) {
    Model = SalesReturns;
    trans = "sales_returns";

    if (other_set) Model = SalesReturnsOtherSet;
  }

  /**
   * double check if there are items
   */
  if (req.body.items.length <= 0) {
    return res.status(401).json({ msg: "No items" });
  }

  CounterModel.increment(trans).then(async ({ next }) => {
    const trans_result = await CounterModel.increment("trans_id");

    const warehouse = await getStoreWarehouse();
    const sale = {
      warehouse,
      trans_id: trans_result.next,
      sales_id: next,
      datetime: moment.tz(process.env.TIMEZONE).toDate(),
      items: req.body.items,
      customer: req.body.customer,
      summary: req.body.summary,
      payments: req.body.payments,
      user: req.body.user,
      is_senior: req.body.is_senior,
      table,
      tieup_information: req.body.tieup_information,
      sales_order_id: req.body.sales_order_id,
      seller: req.body.seller,
    };

    const newSale = new Model(sale);

    newSale.save().then(async (Sale) => {
      //clear table here
      /* deductInventoryFromSales(Sale); */

      trackSale(Sale);

      printSale(
        { ...Sale.toObject() },
        {
          reprint: 0,
          SalesModel: Model,
        }
      ).catch((err) => {
        console.log(err);
        console.log("Unable to Print in receipt printer");
      });

      if (Sale.sales_order_id) {
        const log = await SalesOrder.deleteOne({
          _id: ObjectId(Sale.sales_order_id),
        }).exec();
      }

      /**
       * CHECK FOR SUSPENDED SALE
       */

      if (!isEmpty(req.body.suspended_sale)) {
        const deleted = {
          user: req.body.user,
          datetime: moment.tz(moment(), process.env.TIMEZONE),
          reason: req.body.reason,
        };

        await SuspendSale.findByIdAndUpdate(
          req.body.suspended_sale._id,
          {
            $set: {
              deleted,
            },
          },
          {
            new: true,
          }
        ).exec();
      }

      return res.json({ success: 1 });
    });
  });
});

router.delete("/:account_collection_no/account-collection-no", (req, res) => {
  const account_collection_no = req.params.account_collection_no;

  /** void sale */

  const deleted = {
    user: req.body.user,
    authorized_by: req.body.authorized_by,
    datetime: moment.tz(moment(), process.env.TIMEZONE),
    reason: req.body.reason,
  };

  AccountCollection.findOneAndUpdate(
    {
      account_collection_no: parseInt(account_collection_no),
    },
    {
      $set: {
        deleted,
      },
    },
    {
      new: true,
    }
  ).then((voided_sale) => {
    return res.json({
      id: req.params.account_collection_no,
      user: req.body.user,
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

router.delete("/:id/suspended-sale", (req, res) => {
  const deleted = {
    user: req.body.user,
    datetime: moment.tz(moment(), process.env.TIMEZONE),
    reason: req.body.reason,
  };

  SuspendSale.findByIdAndUpdate(
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
    return res.json({ id: req.params.id, user: req.body.user });
  });
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
            particulars: `Voided Sale OS#${sale.sales_id}`,
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

const printZreadSummary = (zread, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
        device = new printer_escpos.Network(
          process.env.CASHIER_PRINTER_IP,
          9100
        );
      } else {
        device = new printer_escpos.USB(
          process.env.VENDOR_ID,
          process.env.PRODUCT_ID
        );
      }
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const printer = new printer_escpos.Printer(device);
    device?.open(async (printer_error) => {
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

      printer.print(`Z R E A D   S U M M A R Y\n\n`);

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
          value: "1",
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

      // printer.print(
      //   printLabelValueFormat({
      //     label: `SERIAL`,
      //     value: process.env.serial_no,
      //   })
      // );

      printer.print(
        printLabelValueFormat({
          label: `PRINTED`,
          value: moment().format("LLL"),
        })
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      printer.print("\n");
      printer.print(`${escpos.ALIGN_CENTER}*** INCLUSIVE OF VOID ***\n`);
      printer.print(escpos.ALIGN_LEFT);

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
          label: `NET AMOUNT`,
          amount: zread.net_amount,
        })
      );

      printer.print("\n");
      printer.print(`${escpos.ALIGN_CENTER}*** NET OF VOID ***\n`);
      printer.print(escpos.ALIGN_LEFT);

      printer.print(
        printLabelAmountFormat({
          label: `GROSS AMOUNT`,
          amount: zread.net_of_void_gross_amount,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `LESS RETURNS`,
          amount: zread.net_of_void_total_returns,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS VAT SC/PWD DEDUCTION`,
          amount: zread.net_of_void_less_vat,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS SC DISC`,
          amount: zread.net_of_void_less_sc_disc,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS DISC`,
          amount: zread.net_of_void_less_disc,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `NET AMOUNT`,
          amount: zread.net_of_void_net_amount,
        })
      );

      printer.print("\n");

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
          label: `CHEQUE SALES`,
          amount: zread.check_sales,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `F.O.C SALES`,
          amount: zread.free_of_charge_sales,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `ONLINE PAYMENT SALES`,
          amount: zread.online_payment_sales,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `CHARGE TO ACCOUNT SALES`,
          amount: zread.charge_to_account_sales,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `G.C. SALES`,
          amount: zread.gift_check_sales,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `NET AMOUNT`,
          amount: zread.net_amount,
        })
      );

      printer.print("\n");

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

      printer.print("\n");

      const transaction_count = round(
        zread.to_sales_id - zread.from_sales_id + 1
      );
      const average_check = round(zread.net_amount / transaction_count);

      printer.print(
        printLabelValueFormat({
          label: `RECEIPTS COUNT`,
          value: transaction_count.toString(),
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `AVERAGE CHECK`,
          amount: average_check,
        })
      );

      printer.print("\n");

      printer.print(
        `INVOICE FROM ${zread.from_sales_id} TO ${zread.to_sales_id}\n`
      );

      printer.print(
        `# OF VOIDED INVOICES ${zread.number_of_voided_invoices || 0}\n`
      );

      printer.print(escpos.INITALIZE);
      printer.print("\n\n");
      printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(
        "POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n"
      );

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
      printer.close();
    });
    return resolve({ success: 1 });
  });
};

const printZread = (zread, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
        device = new printer_escpos.Network(
          process.env.CASHIER_PRINTER_IP,
          9100
        );
      } else {
        device = new printer_escpos.USB(
          process.env.VENDOR_ID,
          process.env.PRODUCT_ID
        );
      }
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
    }

    const printer = new printer_escpos.Printer(device);
    device?.open(async (printer_error) => {
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      // printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      // printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

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
          value: "1",
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

      // printer.print(
      //   printLabelValueFormat({
      //     label: `SERIAL`,
      //     value: process.env.serial_no,
      //   })
      // );

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

      /* if (zread.credit_card_transactions.length > 0) {
        printer.print("CREDIT CARD TRANSACTIONS\n");

        zread.credit_card_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  BANK`,
              value: o.credit_card.bank,
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
      } */

      if (zread.credit_card_summary.length > 0) {
        printer.print("CREDIT CARD SUMMARY\n");
        zread.credit_card_summary.forEach((o) => {
          printer.print(
            printLabelAmountFormat({
              label: o.card,
              amount: o.amount,
            })
          );
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (zread.credit_card_summary_per_bank.length > 0) {
        printer.print("CREDIT CARD SUMMARY PER BANK\n");
        zread.credit_card_summary_per_bank.forEach((o) => {
          printer.print(
            printLabelAmountFormat({
              label: o.bank,
              amount: o.amount,
            })
          );
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      /**
       * END OF CREDIT CARD
       */

      /* if (zread.check_transactions.length > 0) {
        printer.print("CHECK TRANSACTIONS\n");

        zread.check_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  BANK`,
              value: o.transaction.bank,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  ACCOUNT NAME`,
              value: o.transaction.name,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  CHECK NO.`,
              value: o.transaction.check_no,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  CHECK DATE`,
              value: moment(o.transaction.check_date).format("MM/DD/YYYY"),
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      } */

      if (zread.free_of_charge_transactions.length > 0) {
        printer.print("F.O.C TRANSACTIONS\n");

        zread.free_of_charge_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  NAME`,
              value: o.transaction.name,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  REMARKS`,
              value: o.transaction.remarks || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (zread.online_payment_transactions.length > 0) {
        printer.print("OTHER PAYMENT TRANSACTIONS\n");

        zread.online_payment_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  TYPE`,
              value: o.transaction.depository,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  REFERENCE`,
              value: o.transaction.reference || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (zread.charge_to_account_transactions.length > 0) {
        printer.print("CHARGE TO ACCOUNT TRANSACTIONS\n");

        zread.charge_to_account_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  NAME`,
              value:
                (o.transaction.account && o.transaction.account.name) || "",
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  COMPANY`,
              value:
                (o.transaction.account && o.transaction.account.company) || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      /**
       * ACCOUNT COLLECTION DEPOSIT
       */

      /*  printer.print("ACCOUNT COLLECTIONS/DEPOSITS\n");

      async.eachOfSeries(zread.account_collection_summary, (o, key, cb) => {
        printer.print(
          printLabelAmountFormat({
            label: `  ${key.replace(/_/g, " ").toUpperCase()}`,
            amount: o,
          })
        );
        cb(null);
      });
 */
      if (zread.gift_check_collections.length > 0) {
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        printer.print("G.C. COLLECTIONS\n");

        zread.gift_check_collections.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  ISSUED TO`,
              value: o.issued_to,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  GC#`,
              value: o.gift_check_no.toString().padStart(8, "0"),
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  PAYMENT TYPE`,
              value: o.payment_type,
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.amount,
            })
          );
          printer.print("\n");
        });
      }

      if (zread.gift_check_transactions.length > 0) {
        printer.print("G.C. TRANSACTIONS\n");

        zread.gift_check_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  GC#`,
              value: o.transaction.gift_check.gift_check_no,
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      printer.print("\n");
      /* printer.print(`${escpos.ALIGN_CENTER}*** INCLUSIVE OF VOID ***\n`); */
      printer.print(escpos.ALIGN_LEFT);

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
          label: `NET AMOUNT`,
          amount: zread.net_amount,
        })
      );

      printer.print("\n");

      /* printer.print(`${escpos.ALIGN_CENTER}*** NET OF VOID ***\n`);
      printer.print(escpos.ALIGN_LEFT);

      printer.print(
        printLabelAmountFormat({
          label: `GROSS AMOUNT`,
          amount: zread.net_of_void.gross_amount,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `LESS RETURNS`,
          amount: zread.net_of_void.total_returns,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS VAT SC/PWD DEDUCTION`,
          amount: zread.net_of_void.less_vat,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS SC DISC`,
          amount: zread.net_of_void.less_sc_disc,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS DISC`,
          amount: zread.net_of_void.less_disc,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `NET AMOUNT`,
          amount: zread.net_of_void.net_amount,
        })
      );

      printer.print("\n"); */

      if (zread.gift_check_collection_payment_types.length > 0) {
        zread.gift_check_collection_payment_types.forEach((o) => {
          printer.print(
            printLabelAmountFormat({
              label: `  GC ${o.payment_type.toUpperCase()}`,
              amount: o.amount,
            })
          );
        });
      }

      printer.print(
        printLabelAmountFormat({
          label: `CASH SALES`,
          amount: zread.cash_sales,
        })
      );

      //cash count
      printer.print(
        printLabelAmountFormat({
          label: `CASH COUNT`,
          amount: zread.cash_count?.total_amount || 0,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `CASH VARIANCE`,
          amount: zread.cash_variance || 0,
        })
      );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CREDIT CARD SALES`,
      //     amount: zread.credit_card_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CHEQUE SALES`,
      //     amount: zread.check_sales,
      //   })
      // );

      /* printer.print(
        printLabelAmountFormat({
          label: `F.O.C SALES`,
          amount: zread.free_of_charge_sales,
        })
      ); */

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `OTHER PAYMENT SALES`,
      //     amount: zread.online_payment_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CHARGE TO ACCOUNT SALES`,
      //     amount: zread.charge_to_account_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `G.C. SALES`,
      //     amount: zread.gift_check_sales,
      //   })
      // );

      printer.print("\n");

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

      printer.print("\n");

      const transaction_count = round(
        zread.to_sales_id - zread.from_sales_id + 1
      );
      const average_check = round(zread.net_amount / transaction_count);

      printer.print(
        printLabelValueFormat({
          label: `RECEIPTS COUNT`,
          value: transaction_count.toString(),
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `AVERAGE CHECK`,
          amount: average_check,
        })
      );

      printer.print("\n");

      printer.print(
        `INVOICE FROM ${zread.from_sales_id} TO ${zread.to_sales_id}\n`
      );

      printer.print(
        `# OF VOIDED INVOICES ${zread.number_of_voided_invoices}\n`
      );

      printer.print(escpos.INITALIZE);
      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });
  });
};

const printXread = (xread, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
        device = new printer_escpos.Network(
          process.env.CASHIER_PRINTER_IP,
          9100
        );
      } else {
        device = new printer_escpos.USB(
          process.env.VENDOR_ID,
          process.env.PRODUCT_ID
        );
      }
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const printer = new printer_escpos.Printer(device);
    device?.open(async (printer_error) => {
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      // printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      // printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

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

      // printer.print(
      //   printLabelValueFormat({
      //     label: `SERIAL`,
      //     value: process.env.serial_no,
      //   })
      // );

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
              label: `  OS#`,
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
              label: `  BANK`,
              value: o.credit_card.bank,
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

      if (xread.credit_card_summary_per_bank.length > 0) {
        printer.print("CREDIT CARD SUMMARY PER BANK\n");
        xread.credit_card_summary_per_bank.forEach((o) => {
          printer.print(
            printLabelAmountFormat({
              label: o.bank,
              amount: o.amount,
            })
          );
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      /**
       * END OF CREDIT CARD
       */

      if (xread.check_transactions.length > 0) {
        printer.print("CHECK TRANSACTIONS\n");

        xread.check_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  BANK`,
              value: o.transaction.bank,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  ACCOUNT NAME`,
              value: o.transaction.name,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  CHECK NO.`,
              value: o.transaction.check_no,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  CHECK DATE`,
              value: moment(o.transaction.check_date).format("MM/DD/YYYY"),
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (xread.free_of_charge_transactions.length > 0) {
        printer.print("F.O.C TRANSACTIONS\n");

        xread.free_of_charge_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  NAME`,
              value: o.transaction.name,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  REMARKS`,
              value: o.transaction.remarks || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (xread.online_payment_transactions.length > 0) {
        printer.print("ONLINE PAYMENT TRANSACTIONS\n");

        xread.online_payment_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  DEPOSITORY`,
              value: o.transaction.depository,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  REFERENCE`,
              value: o.transaction.reference || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      if (xread.charge_to_account_transactions.length > 0) {
        printer.print("CHARGE TO ACCOUNT TRANSACTIONS\n");

        xread.charge_to_account_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  NAME`,
              value:
                (o.transaction.account && o.transaction.account.name) || "",
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  COMPANY`,
              value:
                (o.transaction.account && o.transaction.account.company) || "",
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      /**
       * ACCOUNT COLLECTION DEPOSIT
       */

      // printer.print("ACCOUNT COLLECTIONS/DEPOSITS\n");

      // async.eachOfSeries(xread.account_collection_summary, (o, key, cb) => {
      //   printer.print(
      //     printLabelAmountFormat({
      //       label: `  ${key.replace(/_/g, " ").toUpperCase()}`,
      //       amount: o,
      //     })
      //   );
      //   cb(null);
      // });

      // printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      if (xread.gift_check_transactions.length > 0) {
        printer.print("G.C. TRANSACTIONS\n");

        xread.gift_check_transactions.forEach((o) => {
          printer.print(
            printLabelValueFormat({
              label: `  OS#`,
              value: o.sales_id,
            })
          );

          printer.print(
            printLabelValueFormat({
              label: `  GC#`,
              value: o.transaction.gift_check.items.gift_check_number,
            })
          );

          printer.print(
            printLabelAmountFormat({
              label: `  AMOUNT`,
              amount: o.transaction.amount,
            })
          );
          printer.print("\n");
        });
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      }

      printer.print("\n");
      // printer.print(`${escpos.ALIGN_CENTER}*** INCLUSIVE OF VOID ***\n`);
      printer.print(escpos.ALIGN_LEFT);

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
          label: `NET AMOUNT`,
          amount: xread.net_amount,
        })
      );

      printer.print("\n");

      /* printer.print(`${escpos.ALIGN_CENTER}*** NET OF VOID ***\n`);
      printer.print(escpos.ALIGN_LEFT);

      printer.print(
        printLabelAmountFormat({
          label: `GROSS AMOUNT`,
          amount: xread.net_of_void.gross_amount,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `LESS RETURNS`,
          amount: xread.net_of_void.total_returns,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS VAT SC/PWD DEDUCTION`,
          amount: xread.net_of_void.less_vat,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS SC DISC`,
          amount: xread.net_of_void.less_sc_disc,
        })
      );

      printer.print(
        printLabelAmountFormat({
          label: `LESS DISC`,
          amount: xread.net_of_void.less_disc,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `NET AMOUNT`,
          amount: xread.net_of_void.net_amount,
        })
      );

      printer.print("\n");

      printer.print(
        printLabelAmountFormat({
          label: `CASH SALES`,
          amount: xread.cash_sales,
        })
      ); */

      //cash count
      printer.print(
        printLabelAmountFormat({
          label: `CASH COUNT`,
          amount: xread.cash_count?.total_amount || 0,
        })
      );
      printer.print(
        printLabelAmountFormat({
          label: `CASH VARIANCE`,
          amount: xread.cash_variance || 0,
        })
      );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CREDIT CARD SALES`,
      //     amount: xread.credit_card_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CHEQUE SALES`,
      //     amount: xread.check_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `F.O.C SALES`,
      //     amount: xread.free_of_charge_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `ONLINE PAYMENT SALES`,
      //     amount: xread.online_payment_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `CHARGE TO ACCOUNT SALES`,
      //     amount: xread.charge_to_account_sales,
      //   })
      // );

      // printer.print(
      //   printLabelAmountFormat({
      //     label: `G.C. SALES`,
      //     amount: xread.gift_check_sales,
      //   })
      // );

      printer.print("\n");

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

      /* printer.print(escpos.INITALIZE);
      printer.print("\n\n");
      printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
      printer.print(escpos.ALIGN_CENTER);

      printer.print(
        "POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n"
      );
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
      printer.print(escpos.BOLD); */

      printer.print(escpos.INITALIZE);
      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });

    return resolve({ success: 1 });
  });
};

const printCashCount = (record, { reprint = 0 } = { reprint: 0 }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
        device = new printer_escpos.Network(
          process.env.CASHIER_PRINTER_IP,
          9100
        );
      } else {
        device = new printer_escpos.USB(
          process.env.VENDOR_ID,
          process.env.PRODUCT_ID
        );
      }
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const printer = new printer_escpos.Printer(device);
    device?.open(async (printer_error) => {
      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      // printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      // printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

      printer.print(`C A S H   C O U N T\n\n`);

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
          label: `CASH COUNT #`,
          value: record.cash_count_id.toString().padStart(12, "0"),
        })
      );

      // printer.print(
      //   printLabelValueFormat({
      //     label: `SERIAL`,
      //     value: process.env.serial_no,
      //   })
      // );

      printer.print(
        printLabelValueFormat({
          label: `USER`,
          value: record.user.name,
        })
      );

      printer.print(
        printLabelValueFormat({
          label: `TRANS DATE`,
          value: moment(record.date).format("LL"),
        })
      );

      printer.print(
        printLabelValueFormat({
          label: `PRINTED`,
          value: moment(record.date).format("LLL"),
        })
      );

      printer.print("\n\n");

      const data = [
        {
          denomination: "Denomination",
          quantity: "Pc(s)",
          amount: "Amount",
        },
      ];

      printer.print(
        columnify(data, {
          include: ["denomination", "quantity", "amount"],
          maxWidth: FILE_WIDTH,
          showHeaders: false,
          config: {
            denomination: {
              minWidth: FILE_WIDTH - 15 - 15 - 2,
            },
            quantity: {
              minWidth: 15,
              align: "right",
            },
            amount: {
              minWidth: 15,
              align: "right",
            },
          },
        }) + "\n"
      );
      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      await async.eachSeries(record.items, (item, cb) => {
        const data = [
          {
            denomination: numberFormat(item.denomination),
            quantity: numberFormat(item.quantity),
            amount: numberFormat(item.amount),
          },
        ];

        printer.print(
          columnify(data, {
            include: ["denomination", "quantity", "amount"],
            maxWidth: FILE_WIDTH,
            showHeaders: false,
            config: {
              denomination: {
                minWidth: FILE_WIDTH - 15 - 15 - 2,
              },
              quantity: {
                minWidth: 15,
                align: "right",
              },
              amount: {
                minWidth: 15,
                align: "right",
              },
            },
          }) + "\n"
        );
        cb(null);
      });

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      printer.print(
        printLabelAmountFormat({
          label: `TOTAL AMOUNT`,
          amount: record.total_amount,
        })
      );

      // printer.print(escpos.INITALIZE);
      // printer.print("\n\n");
      // printer.print(`${"=".repeat(process.env.LINE_MAX_CHAR)}\n`);
      // printer.print(escpos.ALIGN_CENTER);

      // printer.print(
      //   "POS PROVIDER:\nMSALVIO SOFTWARE & HARDWARE\nTECHNOLOGIES\n"
      // );
      // printer.print("BIG.D POS V 1.0\n");
      // printer.print(`L10 B4 Villa Socorro Subd.\nBrgy. Taculing\n`);
      // printer.print(`Bacolod City, Negros Occidental\n`);
      // printer.print(`Vat Registered TIN:284-894-233-00000\n`);
      // printer.print(`Accred No.:${process.env.ACCRED_NO}\n`);
      // printer.print(`Accred Date : ${process.env.ACCRED_DATE}\n`);
      // printer.print(`Valid Until : ${process.env.ACCRED_VALID_UNTIL}\n`);
      // printer.print(`Permit No:${process.env.PERMIT_NO}\n`);
      // printer.print(`Date Issued : ${process.env.PERMIT_DATE_ISSUED}\n`);
      // printer.print(`PTU Valid Until:${process.env.PERMIT_VALID_UNTIL}\n\n`);
      // printer.print(escpos.BOLD);

      printer.print(escpos.INITALIZE);
      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });
    return resolve({ success: 1 });
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
    .allowDiskUse(true)
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

  if (sale.tieup_information && sale.tieup_information.tieup) {
    data = [
      ...data,
      { label: "TIE-UP : ", value: sale.tieup_information.tieup.name },
      {
        label: "BOOKING REFERENCE : ",
        value: sale.tieup_information.booking_reference,
      },
    ];
  }

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
      content += `    OS#${item.returns.sales_id}\n`;
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
          value: numberFormat(0 - o.credit_card.amount),
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

    (sale.payments.checks || []).forEach((o) => {
      data = [
        {
          label: `CK:${o.bank}/${o.check_no}`,
          value: numberFormat(0 - o.amount),
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

  (sale.payments.free_of_charge_payments || []).forEach((o) => {
    data = [
      {
        label: `F.O.C.:${o.name}/${o.remarks}`,
        value: numberFormat(0 - o.amount),
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

  (sale.payments.online_payments || []).forEach((o) => {
    data = [
      {
        label: `Online:${o.depository}/${o.reference}`,
        value: numberFormat(0 - o.amount),
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

  if (sale.payments && sale.payments.charge_to_accounts) {
    await asyncForEach(sale.payments.charge_to_accounts || [], async (o) => {
      const { balance } = await getAccountBalance({ _id: o.account._id });
      data = [
        {
          label: `Charge:${o.account.name}\nBal: ${numberFormat(balance)}`,
          value: numberFormat(0 - o.amount),
        },
      ];

      content +=
        columnify(data, {
          showHeaders: false,
          config: {
            label: {
              minWidth: FILE_WIDTH - 15 - 1,
              maxWidth: FILE_WIDTH - 15 - 1,
            },
            value: {
              minWidth: 15,
              maxWidth: 15,
              align: "right",
            },
          },
        }) + "\n";
    });
  }

  (sale.payments.gift_checks || []).forEach((o) => {
    data = [
      {
        label: `GC:${o.gift_check.items.gift_check_number}`,
        value: numberFormat(0 - o.amount),
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
      .allowDiskUse(true)
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
        $replaceRoot: {
          newRoot: "$items",
        },
      },
      {
        $addFields: {
          name: "$product.name",
          sku: "$product.sku",
        },
      },
      {
        $sort: {
          price: -1,
          name: 1,
        },
      },
    ])
      .allowDiskUse(true)
      .then((seniors) => {
        resolve(seniors);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getDiscountDetailsFromSale = ({ sale, SalesModel = Sales }) => {
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
        $match: {
          "items.discount_detail.user": {
            $exists: true,
            $ne: null,
          },
          "items.discount_detail.authorized_by": {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: {
            user: "$items.discount_detail.user.id",
            authorized_by: "$items.discount_detail.user.id",
          },
          user: {
            $first: "$items.discount_detail.user.name",
          },
          authorized_by: {
            $first: "$items.discount_detail.authorized_by.name",
          },
        },
      },
    ])
      .allowDiskUse(true)
      .then((results) => {
        resolve(results);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
const printBill = (
  record,
  { reprint = 0, SalesModel = VirtualTable } = {
    reprint: 0,
    SalesModel: VirtualTable,
  }
) => {
  return new Promise(async (resolve, reject) => {
    try {
      try {
        if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
          device = new printer_escpos.Network(
            process.env.CASHIER_PRINTER_IP,
            9100
          );
        } else {
          device = new printer_escpos.USB(
            process.env.VENDOR_ID,
            process.env.PRODUCT_ID
          );
        }
      } catch (err) {
        console.log("Unable to connect to Epson Printer");
        return reject({ msg: "Unable to connect to Epson Printer" });
      }

      const printer = new printer_escpos.Printer(device);

      device?.open(async (printer_error) => {
        printer.print(escpos.INITALIZE);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`${escpos.EMPHASIZE}BILL`);
        printer.print("\n\n");
        printer.print(escpos.INITALIZE);
        printer.print(
          `Time        : ${moment(record.datetime).format("LLL")}\n`
        );

        if (record.customer && record.customer.customer_name) {
          const customer = record.customer;
          printer.print(`Customer    : ${customer.customer_name || ""}\n`);
          printer.print(`Address     : ${customer.address || ""}\n`);
          printer.print(`Contact No. : ${customer.contact_no || ""}\n`);
        }

        if (
          record.tieup_information &&
          record.tieup_information.tieup &&
          record.tieup_information.tieup.name
        ) {
          const tieup_information = record.tieup_information;
          printer.print(
            `Tieup        : ${tieup_information.tieup.name || ""}\n`
          );
          printer.print(
            `Booking Ref. : ${tieup_information.booking_reference || ""}\n`
          );
        }

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        const sale_items = await getSaleItems(record, VirtualTable);

        await asyncForEach(sale_items, async (item) => {
          const item_name = `  ${item.name}`;
          const item_amount = numberFormat(item.gross_amount);

          printer.print(escpos.ALIGN_LEFT);
          /* printer.print(
          `  ${item_name}${escpos.CARRIAGE_RETURN}${
            escpos.ALIGN_RIGHT
          }${numberFormat(item.gross_amount)}\n`
        ); */

          let data = [
            {
              name: item_name,
              amount: item_amount,
            },
          ];

          printer.print(
            columnify(data, {
              showHeaders: false,
              config: {
                name: {
                  minWidth: FILE_WIDTH - 10 - 1,
                  maxWidth: FILE_WIDTH - 10 - 1,
                },
                amount: {
                  minWidth: 10,
                  align: "right",
                },
              },
            }) + "\n"
          );

          if (
            ((item.product.add_ons && item.product.add_ons) || []).length > 0
          ) {
            await async.eachSeries(item.product.add_ons, (add_on, cb) => {
              printer.print(`    +${add_on.product.name}\n`);

              cb(null);
            });
          }

          //console.log(item);

          printer.print(
            `    ${item.quantity} @ ${numberFormat(item.product.price)}\n`
          );

          /* if (item.returns && item.returns.sales_id) {
        printer.print(`    OS#${item.returns.sales_id} \n`);
      } */
        });

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        let label, amount, space;

        label = `${record.summary.no_of_items} ITEM(S) `;
        amount = "";
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `SUBTOTAL:`;
        amount = numberFormat(round(record.summary.net_of_returns));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `LESS RETURNS: `;
        amount = numberFormat(round(record.summary.total_returns));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (record.summary.total_returns > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        if (record.summary && record.summary.less_vat > 0) {
          label = `  LESS SC/PWD VAT DEDUCTION`;
          amount = numberFormat(round(record.summary.less_vat));
          space = " ".repeat(
            process.env.LINE_MAX_CHAR - label.length - amount.length
          );
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);

          /* label = `  AMOUNT NET OF VAT`;
        amount = numberFormat(
          round(record.summary.net_of_returns - record.summary.less_vat)
        );
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );
        printer.print(`${label}${space}${amount}\n`);

        printer.print(escpos.ALIGN_LEFT); */
        }

        label = `  LESS SC/PWD DISC`;
        amount = numberFormat(round(record.summary.less_sc_disc));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (record.summary && record.summary.less_sc_disc > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        label = `  LESS DISC`;
        amount = numberFormat(round(record.summary.discount_amount));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        if (record.summary && record.summary.discount_amount > 0) {
          printer.print(`${label}${space}${amount}\n`);
          printer.print(escpos.ALIGN_LEFT);
        }

        /* if (record.summary && record.summary.less_vat > 0) {
        printer.print("\n");
        // SUB TOTAL SALES (SC/PWD)
        let sc_records = round(
          record.summary.vat_exempt_amount - record.summary.less_sc_disc
        );

        label = `  SUB TOTAL SALES(SC/PWD)`;
        amount = numberFormat(sc_records);
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        let regular_records = round(
          record.summary.vatable_amount + record.summary.vat_amount
        );

        label = `  SUB TOTAL SALES(Regular)`;
        amount = numberFormat(regular_records);
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);
      } */

        if (
          record.payments &&
          record.payments.credit_cards &&
          record.payments.credit_cards.length > 0
        ) {
          record.payments.credit_cards.forEach((o) => {
            label = `${
              o.credit_card.card
            }/${o.credit_card.card_number.substring(
              o.credit_card.card_number.length - 4
            )}`;
            amount = numberFormat(0 - o.credit_card.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          record.payments &&
          record.payments.checks &&
          record.payments.checks.length > 0
        ) {
          record.payments.checks.forEach((o) => {
            label = `CK:${o.bank}/${o.check_no}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          record.payments &&
          record.payments.free_of_charge_payments &&
          record.payments.free_of_charge_payments.length > 0
        ) {
          record.payments.free_of_charge_payments.forEach((o) => {
            label = `F.O.C.:${o.name}/${o.remarks}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          record.payments &&
          record.payments.online_payments &&
          record.payments.online_payments.length > 0
        ) {
          record.payments.online_payments.forEach((o) => {
            label = `Online:${o.depository}/${o.reference}`;
            amount = numberFormat(0 - o.amount);

            let data = [
              {
                name: label,
                amount,
              },
            ];

            printer.print(
              columnify(data, {
                showHeaders: false,
                config: {
                  name: {
                    minWidth: FILE_WIDTH - 10 - 1,
                    maxWidth: FILE_WIDTH - 10 - 1,
                  },
                  amount: {
                    minWidth: 10,
                    align: "right",
                  },
                },
              }) + "\n"
            );
          });
        }

        if (
          record.payments &&
          record.payments.charge_to_accounts &&
          record.payments.charge_to_accounts.length > 0
        ) {
          await asyncForEach(record.payments.charge_to_accounts, async (o) => {
            const { balance } = await getAccountBalance({
              _id: o.account._id,
            });

            const label = `Charge:${o.account.name}\nBal: ${numberFormat(
              balance
            )}`;
            const amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        if (
          record.payments &&
          record.payments.gift_checks &&
          record.payments.gift_checks.length > 0
        ) {
          record.payments.gift_checks.forEach((o) => {
            label = `GC:${o.gift_check.items.gift_check_number}`;
            amount = numberFormat(0 - o.amount);

            printer.print(
              printLabelAmountFormat({
                label,
                amount,
              })
            );
          });
        }

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        label = `AMOUNT DUE`;
        amount = numberFormat(round(record.summary.amount_due));
        space = " ".repeat(
          process.env.LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        printer.print(escpos.INITALIZE);
        printer.print(escpos.ALIGN_CENTER);
        printer.print("\n\n");
        /* printer.print("THIS IS NOT YOUR OFFICIAL RECEIPT\n\n"); */
        printer.print("THIS IS NOT YOUR SALES INVOICE\n\n");
        printer.print("THIS DOCUMENT IS NOT VALID\nFOR CLAIM OF INPUT TAX\n");
        printer.print("\n\n\n\n\n\n");
        printer.print(escpos.CUT);
        printer.print(escpos.INITALIZE);
        printer.close();
      });

      resolve({ success: 1 });
    } catch (err) {
      console.log(err);
      reject({ message: err });
    }
  });
};

const printOrderSlip = ({ stations }) => {
  stations.forEach(async (line_station) => {
    const LINE_MAX_CHAR =
      (line_station.station &&
        line_station.station.printer &&
        line_station.station.printer.line_max_char) ||
      process.env.DOT_MATRIX_LINE_MAX_CHAR;

    const ip = `tcp://${line_station.station.ip_address}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip,
    });

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(escpos.EMPHASIZE);
    printer.print(`ORDER SLIP\n`);

    printer.print("\n");
    printer.print(escpos.INITALIZE);
    printer.print(`Time : ${moment.tz(process.env.TIMEZONE).format("LLL")}\n`);

    printer.print(`Station : ${line_station.station.name}\n`);

    printer.print(escpos.EMPHASIZE);

    /* if (table.customer && table.customer.name) {
      const customer = table.customer;
      if (customer && customer.name) printer.print(`${customer.name || ""}\n`);

      if (customer && customer.time) printer.print(`${customer.time || ""}\n`);
    } */

    printer.print(escpos.INITALIZE);

    printer.print(`${"-".repeat(LINE_MAX_CHAR)}\n`);
    printer.print(escpos.EMPHASIZE);
    line_station.station_orders.forEach((o) => {
      let quantity = o.quantity;
      let product_name = o.product.name;

      let data = [
        {
          quantity,
          product_name,
        },
      ];

      printer.print(
        columnify(data, {
          showHeaders: false,
          config: {
            quantity: {
              minWidth: 3,
              maxWidth: 3,
            },
            product_name: {
              minWidth: (FILE_WIDTH - 3) / 2,
              maxWidth: (FILE_WIDTH - 3) / 2,
            },
          },
        }) + "\n"
      );

      if (!isEmpty(o.remarks)) {
        printer.print(`  ${o.remarks}\n`);
      }

      if (o.product.add_ons && o.product.add_ons.length > 0) {
        o.product.add_ons.forEach((add_on) => {
          printer.print(
            `  ${add_on.quantity.toString().padEnd(4)}${add_on.product.name}\n`
          );
        });
      }

      if (!isEmpty(o.product.product_option)) {
        printer.print(`  ${o.product.product_option}\n`);
      }
    });
    printer.print(escpos.INITALIZE);
    printer.print(`${"-".repeat(LINE_MAX_CHAR)}\n`);

    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
    } catch (err) {
      console.log(err);
      console.log("Unable to print order slip, no connection to network");
    }
  });
};

module.exports = router;
