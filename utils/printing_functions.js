const StocksReceiving = require("./../models/StockReceiving");
const columnify = require("columnify");
const mongoose = require("mongoose");
const numberFormat = require("./numberFormat");
const round = require("./round");
const escpos = require("./../config/escpos");
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const moment = require("moment");
const sumBy = require("lodash").sumBy;
const async = require("async");
const StockReceiving = require("./../models/StockReceiving");
const WarehouseTransfer = require("./../models/WarehouseTransfer");
const printer_escpos = require("escpos");
const isEmpty = require("../validators/is-empty");
const Dispatch = require("../models/Dispatch");
const Sales = require("../models/Sales");
const { getAccountBalance } = require("../library/account_functions");
const asyncForEach = require("./asyncForeach");
const {
  getCustomerTransactionFromTruckTally,
  getDeliveryReportForReceipt,
} = require("../library/report_functions");
printer_escpos.USB = require("escpos-usb");
printer_escpos.Network = require("escpos-network");

const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;
const FILE_WIDTH = process.env.LINE_MAX_CHAR;

const ObjectId = mongoose.Types.ObjectId;
module.exports.printLabelAmountFormat = ({ label, amount }) => {
  let data = [
    {
      name: label,
      amount: numberFormat(amount),
    },
  ];

  return (
    columnify(data, {
      showHeaders: false,
      config: {
        name: {
          minWidth: FILE_WIDTH - 20 - 1,
          maxWidth: FILE_WIDTH - 20 - 1,
        },
        amount: {
          minWidth: 20,
          maxWidth: 20,
          align: "right",
        },
      },
    }) + "\n"
  );
};

module.exports.printLabelValueFormat = ({ label, value }) => {
  const formatted_value = value || "";

  let data = [
    {
      name: label,
      amount: formatted_value,
    },
  ];

  return (
    columnify(data, {
      showHeaders: false,
      config: {
        name: {
          minWidth: 20,
          maxWidth: 20,
        },
        amount: {
          minWidth: FILE_WIDTH - 20 - 1,
          maxWidth: FILE_WIDTH - 20 - 1,
          align: "right",
        },
      },
    }) + "\n"
  );
};

module.exports.printDailySalesInventoryReport = ({
  records,
  from_datetime,
  to_datetime,
  user,
}) => {
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
      const config = {
        showHeaders: false,

        config: {
          ITEM: {
            minWidth: process.env.LINE_MAX_CHAR - 20 - 2,
            maxWidth: process.env.LINE_MAX_CHAR - 20 - 2,
          },
          QTY: {
            minWidth: 5,
            maxWidth: 5,
            align: "right",
          },
          NET: {
            minWidth: 15,
            maxWidth: 15,
            align: "right",
          },
        },
      };

      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      /* printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`); */

      printer.print(`DAILY SALES INVENTORY REPORT\n\n`);

      printer.print(escpos.INITALIZE);

      printer.print(
        this.printLabelValueFormat({
          label: `REGISTER`,
          value: "1",
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `FROM DATE/TIME`,
          value: moment(from_datetime).format("LLLL"),
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `TO DATE/TIME`,
          value: moment(to_datetime).format("LLLL"),
        })
      );

      // printer.print(
      //   this.printLabelValueFormat({
      //     label: `SERIAL`,
      //     value: process.env.serial_no,
      //   })
      // );

      printer.print(
        this.printLabelValueFormat({
          label: `USER`,
          value: user.name,
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `PRINTED`,
          value: moment().format("LLL"),
        })
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      printer.print(
        columnify(
          records.map((o) => ({
            ITEM: `${o.product.sku} ${o.product.name}`,
            QTY: o.total_quantity,
            NET: numberFormat(o.net_sales),
          })),
          { ...config, showHeaders: true }
        ) + "\n"
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      printer.print(escpos.BOLD);

      const total_quantity = sumBy(records, (o) => o.total_quantity);
      const net_amount = sumBy(records, (o) => o.net_sales);

      printer.print(
        columnify(
          [
            {
              ITEM: "",
              QTY: total_quantity,
              NET: numberFormat(net_amount),
            },
          ],
          { ...config, showHeaders: false }
        ) + "\n"
      );

      printer.print(escpos.INITALIZE);
      printer.print("\n\n");
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

      // printer.print(escpos.INITALIZE);
      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });
    return resolve({ success: 1 });
  });
};

module.exports.printPhysicalCountForm = ({ records }) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip,
    });

    const config = {
      showHeaders: false,
      config: {
        ITEM: {
          minWidth: process.env.LINE_MAX_CHAR - 5 - 1,
          maxWidth: process.env.LINE_MAX_CHAR - 5 - 1,
        },
        QTY: {
          minWidth: 5,
          maxWidth: 5,
          align: "right",
        },
      },
    };

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`${process.env.trade_name}\n`);
    printer.print(`${process.env.company_name}\n`);
    printer.print(`${process.env.company_address}\n`);
    printer.print(`Vat Registered TIN:${process.env.tin}\n`);
    printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

    printer.print(`PHYSICAL COUNT FORM\n\n`);

    printer.print(escpos.INITALIZE);

    printer.print(
      this.printLabelValueFormat({
        label: `REGISTER`,
        value: "1",
      })
    );

    printer.print(
      this.printLabelValueFormat({
        label: `SERIAL`,
        value: process.env.serial_no,
      })
    );

    printer.print(
      this.printLabelValueFormat({
        label: `PRINTED`,
        value: moment().format("LLL"),
      })
    );

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    async.eachSeries(records, (record, cb) => {
      printer.print(escpos.BOLD);
      printer.print(record.category.name + "\n");
      printer.print(escpos.BOLD_OFF);
      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      printer.print(
        columnify(
          record.items.map((o) => ({
            ITEM: o.name,
            QTY: "_____",
          })),
          { ...config, showHeaders: true }
        ) + "\n"
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      printer.print(escpos.BOLD);

      cb(null);
    });

    printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

    printer.print(escpos.INITALIZE);
    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      reject({ message: err });
    }
  });
};

module.exports.printReceivingReport = ({ _id }) => {
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

    const record = await StockReceiving.findOne({
      _id: ObjectId(_id),
    }).lean();

    const printer = new printer_escpos.Printer(device);

    device?.open(async (printer_error) => {
      const config = {
        showHeaders: false,
        config: {
          ITEM: {
            minWidth: process.env.LINE_MAX_CHAR - 15 - 2,
            maxWidth: process.env.LINE_MAX_CHAR - 15 - 2,
          },
          QTY: {
            minWidth: 5,
            maxWidth: 5,
            align: "right",
          },
          NET: {
            minWidth: 10,
            maxWidth: 10,
            align: "right",
          },
        },
      };

      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`${process.env.trade_name}\n`);
      printer.print(`${process.env.company_name}\n`);
      printer.print(`${process.env.company_address}\n`);
      printer.print(`Vat Registered TIN:${process.env.tin}\n`);
      printer.print(`SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`);

      printer.print(`STOCKS RECEIVING NO. ${record?.rr_no}\n\n`);

      printer.print(escpos.INITALIZE);

      printer.print(
        this.printLabelValueFormat({
          label: `REGISTER`,
          value: "1",
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `DATE/TIME`,
          value: moment(record.date).format("MM/DD/YYYY"),
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `USER`,
          value: record.updated_by?.name,
        })
      );

      printer.print(
        this.printLabelValueFormat({
          label: `PRINTED`,
          value: moment().format("LLL"),
        })
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      printer.print(
        columnify(
          record.items.map((o) => ({
            ITEM: o.stock.name,
            QTY: o.quantity,
            NET: numberFormat(o.amount),
          })),
          { ...config, showHeaders: true }
        ) + "\n"
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      printer.print(escpos.BOLD);
      printer.print(
        columnify(
          [
            {
              ITEM: "",
              QTY: sumBy(record.items, (o) => round(o.quantity)),
              NET: numberFormat(sumBy(record.items, (o) => o.amount)),
            },
          ],
          { ...config, showHeaders: false }
        ) + "\n"
      );

      /* printer.print(
        columnify(
          [
            {
              ITEM: "GRAND TOTAL",
              QTY: "",
              NET: numberFormat(grand_net_total),
            },
          ],
          { ...config, showHeaders: false }
        ) + "\n"
      ); */

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

module.exports.printDispatch = ({ _id }) => {
  return new Promise(async (resolve, reject) => {
    try {
      device = new printer_escpos.Network(
        process.env.DISPATCH_PRINTER_IP,
        9100
      );
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const record = await Dispatch.findOne({
      _id: ObjectId(_id),
    }).lean();

    const printer = new printer_escpos.Printer(device);

    device?.open(async (printer_error) => {
      const config = {
        showHeaders: false,
        QTY: {
          minWidth: 10,
          maxWidth: 10,
          align: "right",
        },
        config: {
          ITEM: {
            minWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
            maxWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
          },
        },
      };

      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(escpos.EMPHASIZE);
      printer.print(`DS#. ${record?.ds_no}\n`);
      printer.print(`${record?.customer?.name}\n`);
      printer.print(`${record?.customer?.location?.name}\n\n`);

      printer.print(escpos.ALIGN_LEFT);
      printer.print(escpos.NORMAL);

      printer.print(
        this.printLabelValueFormat({
          label: `PRINTED`,
          value: moment().format("LLL"),
        })
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      record.items.forEach((o) => {
        printer.print(escpos.EMPHASIZE);
        printer.print(`${o.quantity} - ${o.stock?.sku} ${o.stock?.name}\n`);

        printer.print(escpos.NORMAL);
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      });

      /* const barcode = "001-001";
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`\x1d\x6b\x04${barcode}\x00`); */

      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });
    return resolve({ success: 1 });
  });
};

module.exports.printBundles = ({ _id, bundle }) => {
  return new Promise(async (resolve, reject) => {
    try {
      device = new printer_escpos.Network(process.env.WH_PRINTER_IP, 9100);
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const records = await Dispatch.aggregate([
      {
        $match: {
          _id: new ObjectId(_id),
        },
      },
      {
        $unwind: {
          path: "$items",
        },
      },
      {
        $match: {
          ...(bundle
            ? {
                "items.bundle": parseInt(bundle),
              }
            : {
                "items.bundle": {
                  $gt: 0,
                },
              }),
        },
      },
      {
        $group: {
          _id: {
            bundle: "$items.bundle",
            ds_no: "$ds_no",
            customer: "$customer.name",
            location: "$customer.location.name",
          },
          items: {
            $push: "$items",
          },
        },
      },
      {
        $sort: {
          "_id.ds_no": 1,
          "_id.bundle": 1,
        },
      },
    ]);

    const printer = new printer_escpos.Printer(device);

    device?.open(async (printer_error) => {
      printer.print(escpos.INITALIZE);
      const config = {
        showHeaders: false,
        QTY: {
          minWidth: 10,
          maxWidth: 10,
          align: "right",
        },
        config: {
          ITEM: {
            minWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
            maxWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
          },
        },
      };

      records.forEach((record) => {
        printer.print(escpos.NORMAL);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(escpos.EMPHASIZE);
        printer.print(
          `DS#. ${record?._id?.ds_no} - BUNDLE ${record?._id?.bundle}\n`
        );
        printer.print(`${record?._id?.customer}\n`);
        printer.print(`${record?._id?.location}\n\n`);

        printer.print(escpos.ALIGN_LEFT);
        printer.print(escpos.NORMAL);

        printer.print(
          this.printLabelValueFormat({
            label: `PRINTED`,
            value: moment().format("LLL"),
          })
        );

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        record.items.forEach((o) => {
          printer.print(escpos.EMPHASIZE);
          printer.print(`${o.quantity} - ${o.stock?.sku} ${o.stock?.name}\n`);

          printer.print(escpos.NORMAL);
          printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
        });

        const barcode = `${record?._id?.ds_no}-${record?._id?.bundle}`;
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`\x1d\x6b\x04${barcode}\x00`);

        printer.print("\n\n\n\n\n\n");
        printer.print(escpos.CUT);
      });

      printer.close();
    });
    return resolve({ success: 1 });
  });
};

module.exports.printWarehouseTransfer = ({ _id }) => {
  return new Promise(async (resolve, reject) => {
    const record = await WarehouseTransfer.findOne({
      _id: ObjectId(_id),
    }).lean();

    try {
      device = new printer_escpos.Network(
        record.to_warehouse?.name === "STORE"
          ? process.env.WH_PRINTER_IP
          : process.env.CASHIER_PRINTER_IP,
        9100
      );
    } catch (err) {
      console.log("Unable to connect to Epson Printer");
      return reject({ msg: "Unable to connect to Epson Printer" });
    }

    const printer = new printer_escpos.Printer(device);

    device?.open(async (printer_error) => {
      const config = {
        showHeaders: false,
        QTY: {
          minWidth: 10,
          maxWidth: 10,
          align: "right",
        },
        config: {
          ITEM: {
            minWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
            maxWidth: process.env.LINE_MAX_CHAR / 2 - 10 - 2,
          },
        },
      };

      printer.print(escpos.INITALIZE);
      printer.print(escpos.ALIGN_CENTER);
      printer.print(escpos.EMPHASIZE);
      printer.print(`WT#. ${record?.wt_no}\n`);
      printer.print(`TO: ${record?.to_warehouse?.name}\n`);

      printer.print(escpos.ALIGN_LEFT);
      printer.print(escpos.NORMAL);

      printer.print(
        this.printLabelValueFormat({
          label: `PRINTED`,
          value: moment().format("LLL"),
        })
      );

      printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

      record.items.forEach((o) => {
        printer.print(escpos.EMPHASIZE);
        printer.print(`${o.quantity} - ${o.stock?.sku} ${o.stock?.name}\n`);

        printer.print(escpos.NORMAL);
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
      });

      /* const barcode = "001-001";
      printer.print(escpos.ALIGN_CENTER);
      printer.print(`\x1d\x6b\x04${barcode}\x00`); */

      printer.print("\n\n\n\n\n\n");
      printer.print(escpos.CUT);
      printer.close();
    });
    return resolve({ success: 1 });
  });
};

module.exports.printSaleOut = ({ user, from_datetime, to_datetime }) => {
  return new Promise((resolve, reject) => {
    let SalesModel;

    SalesModel = Sales;

    const _from_datetime = moment(from_datetime).toDate();
    const _to_datetime = moment(to_datetime).toDate();

    SalesModel.aggregate([
      {
        $match: {
          datetime: {
            $gte: _from_datetime,
            $lte: _to_datetime,
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
    ])
      .allowDiskUse(true)
      .then((records) => {
        this.printDailySalesInventoryReport({
          records,
          from_datetime: _from_datetime,
          to_datetime: _to_datetime,
          user,
        });

        return resolve({ records, from_datetime, to_datetime });
      })
      .catch((err) => reject(err));
  });
};

module.exports.printSuspendedSale = (
  { _id, SalesModel = Sales } = { reprint: 0, SalesModel: Sales }
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

      const sale = await SalesModel.findOne({
        _id: ObjectId(_id),
      });

      const printer = new printer_escpos.Printer(device);

      device?.open(async (printer_error) => {
        printer.print(escpos.INITALIZE);
        printer.print(escpos.FONT_A);
        printer.print(escpos.ALIGN_CENTER);

        if (sale.queue_no) {
          printer.print(`\x1d\x21\x77`);
          printer.print(sale.queue_no + "\n\n");
        }
        printer.print(escpos.NORMAL);

        // printer.print(`${process.env.company_name}\n`);
        printer.print(`${process.env.trade_name}\n`);
        printer.print(`${process.env.company_address}\n`);
        // printer.print(`Vat Registered TIN:${process.env.tin}\n`);
        // printer.print(
        //   `SN: ${process.env.serial_no} MIN:${process.env.min}\n\n`
        // );

        printer.print(`\n`);
        printer.print(`B I L L\n\n`);

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        printer.print(escpos.FONT_A);
        printer.print(escpos.ALIGN_LEFT);
        printer.print(escpos.NORMAL);

        printer.print(`Time   : ${moment(sale.datetime).format("LLL")}\n`);
        printer.print(`Seller : ${sale.seller?.name}\n`);

        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        const sale_items = await this.getSaleItems(sale, SalesModel);

        await asyncForEach(sale_items, async (item) => {
          const item_name = `  ${item.name}`;
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

          printer.print(escpos.ALIGN_LEFT);
          printer.print(`    ${item.quantity} @ ${numberFormat(item.price)}\n`);

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
              this.printLabelAmountFormat({
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
              this.printLabelAmountFormat({
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
              this.printLabelAmountFormat({
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
              this.printLabelAmountFormat({
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
              this.printLabelAmountFormat({
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

        const barcode = sale.reference;
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`\x1d\x6b\x04${barcode}\x00`);

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

module.exports.getSaleItems = (sale, SalesModel = Sales) => {
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

module.exports.printDeliveryReportForReceipt = ({ truck_tally }) => {
  return new Promise(async (resolve, reject) => {
    const records = await getDeliveryReportForReceipt({ truck_tally });

    try {
      if (!isEmpty(process.env.CASHIER_PRINTER_IP)) {
        device = new printer_escpos.Network(process.env.WH_PRINTER_IP, 9100);
      } else {
        device = new printer_escpos.USB(
          process.env.VENDOR_ID,
          process.env.PRODUCT_ID
        );
      }

      const printer = new printer_escpos.Printer(device);

      device?.open(async (printer_error) => {
        printer.print(escpos.INITALIZE);
        printer.print(escpos.FONT_B);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`\n`);
        printer.print(`DELIVERY REPORT\n\n`);

        printer.print(escpos.ALIGN_LEFT);
        printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

        records.forEach((record) => {
          printer.print(`  --  ${record?.location?.name} --\n`);
          record.items.forEach((item) => {
            let data = [
              {
                name: item.customer?.name,
                ds_no: item.ds_no.join(", "),
                total_amount: numberFormat(item.total_amount),
              },
            ];

            printer.print(
              columnify(data, {
                showHeaders: false,
                config: {
                  name: {
                    minWidth: process.env.LINE_MAX_CHAR - 35 - 2,
                    maxWidth: process.env.LINE_MAX_CHAR - 35 - 2,
                  },
                  ds_no: {
                    minWidth: 15,
                    maxWidth: 15,
                    align: "right",
                  },
                  total_amount: {
                    align: "right",
                    minWidth: 20,
                    maxWidth: 20,
                  },
                },
              }) + "\n"
            );
          });
        });
        printer.print("\n\n\n\n\n\n\n\n");
        printer.print(escpos.CUT);
        printer.close();
      });
      return resolve(true);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports.printCustomerDeliveryReceipt = ({ truck_tally, customer }) => {
  return new Promise(async (resolve, reject) => {
    try {
      try {
        if (!isEmpty(process.env.DR_PRINTER_IP)) {
          device = new printer_escpos.Network(process.env.DR_PRINTER_IP, 9100);
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

      const sale = await getCustomerTransactionFromTruckTally({
        truck_tally,
        customer,
      });

      const printer = new printer_escpos.Printer(device);

      device?.open(async (printer_error) => {
        printer.print(escpos.INITALIZE);
        printer.print(escpos.FONT_B);
        printer.print(escpos.ALIGN_CENTER);
        printer.print(`\n`);
        printer.print(`DELIVERY RECEIPT\n\n`);

        printer.print(`${"-".repeat(process.env.DOT_MATRIX_LINE_MAX_CHAR)}\n`);

        printer.print(escpos.ALIGN_LEFT);
        // printer.print(escpos.INITALIZE);

        printer.print(`Time : ${moment(sale.date).format("MM/DD/YYYY")}\n`);

        printer.print(`Customer : ${sale.customer?.name}\n`);
        printer.print(`Location : ${sale.customer?.location?.name}\n`);
        printer.print(`DS#      : ${sale.ds_no.join(", ")}\n`);

        printer.print(`${"-".repeat(process.env.DOT_MATRIX_LINE_MAX_CHAR)}\n`);

        sale.items.forEach((item) => {
          const item_name = `  ${item.stock?.sku} ${item.stock?.name}`;
          const item_amount = numberFormat(item.amount);

          let data = [
            {
              quantity: item.quantity,
              name: item_name,
              price: numberFormat(item.price),
              amount: item_amount,
            },
          ];

          printer.print(
            columnify(data, {
              showHeaders: false,
              config: {
                quantity: {
                  minWidth: 6,
                  maxWidth: 6,
                },
                name: {
                  minWidth: process.env.DOT_MATRIX_LINE_MAX_CHAR - 26 - 3,
                  maxWidth: process.env.DOT_MATRIX_LINE_MAX_CHAR - 26 - 3,
                },
                price: {
                  minWidth: 10,
                  maxWidth: 10,
                  align: "right",
                },
                amount: {
                  minWidth: 10,
                  maxWidth: 10,
                  align: "right",
                },
              },
            }) + "\n"
          );

          printer.print(
            `${"-".repeat(process.env.DOT_MATRIX_LINE_MAX_CHAR)}\n`
          );
        });

        /* printer.print(`${"-".repeat(process.env.DOT_MATRIX_LINE_MAX_CHAR)}\n`); */

        let label, amount, space;

        label = `${sumBy(sale.items, (o) => o.quantity)} ITEM(S) `;
        amount = "";
        space = " ".repeat(
          process.env.DOT_MATRIX_LINE_MAX_CHAR - label.length - amount.length
        );

        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_LEFT);

        label = `AMOUNT DUE`;
        amount = numberFormat(round(sumBy(sale.items, (o) => o.amount)));
        space = " ".repeat(
          process.env.DOT_MATRIX_LINE_MAX_CHAR - label.length - amount.length
        );
        printer.print(`${label}${space}${amount}\n`);
        printer.print(escpos.ALIGN_CENTER);
        printer.print("\n\n");

        printer.print(escpos.BOLD);
        printer.print("RECEIVED THE GOODS ABOVE IN GOOD ORDER");

        printer.print("\n\n\n\n\n\n\n\n");
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
