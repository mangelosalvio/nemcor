const express = require("express");
const router = express.Router();
const moment_tz = require("moment-timezone");
const Counter = require("./../../models/Counter");
const AccountPayment = require("./../../models/AccountPayment");
const Account = require("./../../models/Account");
const isEmpty = require("./../../validators/is-empty");
const filterId = require("./../../utils/filterId");
const round = require("./../../utils/round");
const numberFormat = require("./../../utils/numberFormat");
const mongoose = require("mongoose");
const validate = require("./../../validators/account_payments");
const moment = require("moment-timezone");
const net = require("net");
const constants = require("./../../config/constants");
const escpos = require("./../../config/escpos");
const takeRight = require("lodash").takeRight;
const Model = AccountPayment;
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

const ORDER_STATION_PRINTER_IP = process.env.ORDER_STATION_PRINTER_IP;
const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;

saveToAccountLedger = account_payment => {
  return new Promise((resolve, reject) => {
    const account = account_payment.account;
    Account.findById(account._id)
      .then(account => {
        if (account) {
          const ledger = [
            ...account.ledger.toObject(),
            {
              date: moment_tz.tz(process.env.TIMEZONE).toDate(),
              particulars: `AP#${account_payment.account_payment_id}`,
              debit: 0,
              credit: account_payment.amount,
              kind: "account_payments",
              item: account_payment._id
            }
          ];

          let running = 0;
          const updatedLedger = ledger.map(o => {
            running -= parseFloat(o.debit);
            running += parseFloat(o.credit);
            return {
              ...o,
              running
            };
          });

          account
            .set({
              ledger: updatedLedger
            })
            .save()
            .then(record => resolve(record))
            .catch(err => reject(err));
        }
      })
      .catch(err => reject(err));
  });
};

updateAccountLedger = account_payment => {
  Account.updateOne(
    {
      ledger: {
        $elemMatch: {
          item: mongoose.Types.ObjectId(account_payment._id),
          kind: "account_payments"
        }
      }
    },
    {
      $set: {
        "ledger.$.particulars": account_payment.particulars,
        "ledger.$.credit": account_payment.amount
      }
    }
  ).then(() => {
    Account.findById(account_payment.account._id).then(account => {
      const ledger = [...account.ledger.toObject()];
      let running = 0;
      const updatedLedger = ledger.map(o => {
        running -= parseFloat(o.debit);
        running += parseFloat(o.credit);
        return {
          ...o,
          running
        };
      });

      account.ledger = updatedLedger;
      account.save();
    });
  });
};

router.get("/:id", (req, res) => {
  Model.findById(req.params.id)
    .then(record => res.json(record))
    .catch(err => console.log(err));
});

router.get("/", (req, res) => {
  const form_data = isEmpty(req.query)
    ? {}
    : {
        "account.name": {
          $regex: new RegExp("^" + req.query.s, "i")
        }
      };

  Model.find(form_data)
    .sort({ _id: -1 })
    .then(records => {
      return res.json(records);
    })
    .catch(err => console.log(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validate(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  const form_data = filterId(req);
  Counter.increment("account_payment_id").then(({ next }) => {
    const newRecord = new Model({
      ...form_data,
      account_payment_id: next,
      date: moment_tz.tz(process.env.TIMEZONE).toDate()
    });

    newRecord
      .save()
      .then(record => {
        saveToAccountLedger(record).then(account => {
          printAccountPayment({ account_payment: record, account });
        });
        return res.json(record);
      })
      .catch(err => console.log(err));
  });
});

router.post("/listings", (req, res) => {
  const deleted_exists = req.body.voided ? true : false;
  AccountPayment.find({
    deleted: {
      $exists: deleted_exists
    },
    date: {
      $gte: moment(req.body.period_covered[0])
        .startOf("day")
        .toDate(),
      $lte: moment(req.body.period_covered[1])
        .endOf("day")
        .toDate()
    }
  }).then(account_payments => res.json(account_payments));
});

router.post("/account-ledger", (req, res) => {
  const account = req.body.account;

  Account.findOne({
    _id: mongoose.Types.ObjectId(account._id)
  }).then(account => {
    printLatestAccountLedger({
      account
    });
  });

  return res.json({ success: 1 });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validate(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  Model.findById(req.params.id).then(record => {
    if (record) {
      const form_data = filterId(req);

      record.set({
        ...form_data
      });
      record
        .save()
        .then(record => {
          updateAccountLedger(record);
          return res.json(record);
        })
        .catch(err => console.log(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id", (req, res) => {
  const deleted = {
    user: req.body.user,
    datetime: moment.tz(moment(), process.env.TIMEZONE),
    reason: req.body.reason
  };

  AccountPayment.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        deleted
      }
    },
    {
      new: true
    }
  ).then(account_payment => {
    debitAccountOnVoidAccountPayment(account_payment);
    return res.json({ id: req.params.id, user: req.body.user });
  });
});

debitAccountOnVoidAccountPayment = account_payment => {
  Account.findById(account_payment.account._id).then(account => {
    if (account) {
      let ledger = [...account.ledger];
      const last_ledger = ledger[ledger.length - 1];
      const running_balance = last_ledger.running
        ? round(last_ledger.running)
        : 0;
      const new_running_balance = round(
        running_balance - account_payment.amount
      );

      ledger = [
        ...ledger,
        {
          date: moment.tz(moment(), process.env.TIMEZONE),
          particulars: `Voided Account Payment ; AP#${account_payment.account_payment_id}`,
          debit: round(account_payment.amount),
          credit: 0,
          running: new_running_balance
        }
      ];
      account.ledger = [...ledger];
      account.save();
    }
  });
};

const printAccountPayment = ({ account_payment, account }) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip
    });

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(escpos.EMPHASIZE);
    printer.print(`365 MODERN CAFE\n`);
    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`A C C O U N T   P A Y M E N T\n\n`);
    printer.print(escpos.INITALIZE);
    printer.print(`AP # : ${account_payment.account_payment_id}\n`);
    printer.print(`Time : ${moment(account_payment.date).format("LLL")}\n`);
    printer.print(`Name : ${account_payment.account.name}\n`);
    printer.print(`Company : ${account_payment.account.company_name}\n`);

    printer.print(`${"-".repeat(40)}\n`);

    if (account_payment.payment_type === constants.PAYMENT_TYPE_CASH) {
      printer.print(
        `  ${account_payment.payment_type}${escpos.CARRIAGE_RETURN}${
          escpos.ALIGN_RIGHT
        }${numberFormat(round(account_payment.amount))}\n`
      );
      printer.print(escpos.ALIGN_LEFT);
    } else {
      printer.print(
        `${
          account_payment.credit_card.card
        }/${account_payment.credit_card.card_number.substring(
          account_payment.credit_card.card_number.length - 4
        )}${escpos.CARRIAGE_RETURN}${escpos.ALIGN_RIGHT}${numberFormat(
          account_payment.amount
        )}\n`
      );
      printer.print(escpos.ALIGN_LEFT);
    }

    /**
     * PRINT LEDGER HERE
     */
    printer.print(`${"-".repeat(40)}\n`);
    printer.print("LAST 10 TRANSACTIONS\n");

    takeRight(account.ledger, 10).forEach(o => {
      printer.print(
        `${moment(o.date)
          .format("MM/DD/YY")
          .padEnd(10, " ")}`
      );
      printer.print(`${o.particulars.substring(0, 10).padEnd(10, " ")}`);

      if (o.debit > 0) {
        printer.print(`(${numberFormat(o.debit).padStart(8, " ")})`);
      } else {
        printer.print(`${numberFormat(o.credit).padStart(10, " ")}`);
      }
      printer.print(`${numberFormat(o.running).padStart(10, " ")}`);
      printer.print("\n");
    });

    /**
     * CREDIT CARD DETAILS
     */

    printer.print(escpos.ALIGN_LEFT);
    if (
      account_payment.payment_type === constants.PAYMENT_TYPE_CREDIT_CARD &&
      account_payment.credit_card
    ) {
      printer.print(`${"-".repeat(40)}\n`);
      printer.print("CREDIT CARD DETAILS\n");
      printer.print(escpos.ALIGN_CENTER);

      printer.print("\n\n\n\n");
      printer.print(`${"_".repeat(30)}\n`);
      printer.print(`${account_payment.credit_card.name}\n`);
      printer.print(
        `${
          account_payment.credit_card.card
        }/${account_payment.credit_card.card_number.substring(
          account_payment.credit_card.card_number.length - 4
        )}\n`
      );
      printer.print(escpos.ALIGN_LEFT);
    }

    printer.print(`${"-".repeat(40)}\n`);
    printer.print(escpos.ALIGN_CENTER);
    printer.print("\n\n\n\n");
    printer.print(`${"_".repeat(30)}\n`);
    printer.print(`${account_payment.account.name}\n`);
    printer.print(`${account_payment.account.company_name}\n`);
    printer.print(escpos.ALIGN_LEFT);

    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      console.log("error");
      reject({ message: err });
    }
  });
};

const printLatestAccountLedger = ({ account }) => {
  return new Promise(async (resolve, reject) => {
    const ip = `tcp://${CASHIER_PRINTER_IP}:9100`;
    let printer = new Printer({
      type: PrinterTypes.EPSON,
      interface: ip
    });

    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(escpos.EMPHASIZE);
    printer.print(`365 MODERN CAFE\n`);
    printer.print(escpos.INITALIZE);
    printer.print(escpos.ALIGN_CENTER);
    printer.print(`A C C O U N T   L E D G E R\n`);
    printer.print(`L A S T   1 0   T R A N S A C T I O N S\n\n`);
    printer.print(escpos.INITALIZE);

    printer.print(
      `Time : ${moment.tz(moment(), process.env.TIMEZONE).format("LLL")}\n`
    );
    printer.print(`Name : ${account.name}\n`);
    printer.print(`Company : ${account.company_name}\n`);

    /**
     * PRINT LEDGER HERE
     */
    printer.print(`${"-".repeat(40)}\n`);
    printer.print("LAST 10 TRANSACTIONS\n");

    takeRight(account.ledger, 10).forEach(o => {
      printer.print(
        `${moment(o.date)
          .format("MM/DD/YY")
          .padEnd(10, " ")}`
      );
      printer.print(`${o.particulars.substring(0, 10).padEnd(10, " ")}`);

      if (o.debit > 0) {
        printer.print(`(${numberFormat(o.debit).padStart(8, " ")})`);
      } else {
        printer.print(`${numberFormat(o.credit).padStart(10, " ")}`);
      }
      printer.print(`${numberFormat(o.running).padStart(10, " ")}`);
      printer.print("\n");
    });

    printer.print(`${"-".repeat(40)}\n`);
    printer.print("\n\n\n\n\n\n");
    printer.print(escpos.CUT);

    try {
      let execute = await printer.execute();
      resolve({ success: 1 });
    } catch (err) {
      console.log("error");
      reject({ message: err });
    }
  });
};

module.exports = router;
