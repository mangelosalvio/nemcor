const express = require("express");
const router = express.Router();
const Table = require("./../../models/Table");
const DeletedOrder = require("./../../models/DeletedOrder");
const Order = require("./../../models/Order");
const DeletedOrderOtherSet = require("./../../models/DeletedOrderOtherSet");
const Counter = require("./../../models/Counter");
const CounterOtherSet = require("./../../models/CounterOtherSet");

const isEmpty = require("./../../validators/is-empty");
const numberFormat = require("./../../utils/numberFormat");
const net = require("net");
const moment = require("moment-timezone");
const incrementInventoryFromOrders =
  require("./../../library/update_inventory").incrementInventoryFromOrders;
const incrementInventoryFromUpdatingOrder =
  require("./../../library/update_inventory").incrementInventoryFromUpdatingOrder;
const decrementInventoryFromCancelingOrders =
  require("./../../library/update_inventory").decrementInventoryFromCancelingOrders;
const recordCancelledOrders =
  require("./../../library/update_inventory").recordCancelledOrders;
const report_functions = require("./../../library/report_functions");
const constants = require("./../../config/constants");
const escpos = require("./../../config/escpos");
const async = require("async");
const round = require("./../../utils/round");
const mongoose = require("mongoose");
const Printer = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

const printer_escpos = require("escpos");
printer_escpos.USB = require("escpos-usb");
printer_escpos.Network = require("escpos-network");

const ORDER_STATION_PRINTER_IP = process.env.ORDER_STATION_PRINTER_IP;
const CASHIER_PRINTER_IP = process.env.CASHIER_PRINTER_IP;
const PORT = process.env.PRINTER_PORT;

const validateTableInput = require("./../../validators/tables");
const { printLabelAmountFormat } = require("../../utils/printing_functions");
const columnify = require("columnify");
const { getSettingValueFromKey } = require("../../library/setting_functions");

let CounterModel = Counter;
let DeletedOrderModel = DeletedOrder;

const ObjectId = mongoose.Types.ObjectId;

const FILE_WIDTH = process.env.LINE_MAX_CHAR;

router.get("/:id", (req, res) => {
  Table.findById(req.params.id)
    .then((record) => res.json(record))
    .catch((err) => res.status(401).json(record));
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
    .sort({ name: 1 })
    .collation({ locale: "en_US", numericOrdering: true })
    .then((table) => {
      return res.json(table);
    })
    .catch((err) => res.status(401).json(err));
});

router.put("/", (req, res) => {
  const { isValid, errors } = validateTableInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  Table.findOne({
    name: req.body.name,
  }).then((table) => {
    if (table) {
      errors["name"] = "Table already exists";
      return res.status(401).json(errors);
    } else {
      const newTable = new Table({
        name: req.body.name,
        is_other_set: req.body.is_other_set,
      });
      newTable
        .save()
        .then((table) => res.json(table))
        .catch((err) => res.status(401).json(err));
    }
  });
});

router.post("/:id/orders", (req, res) => {
  const { tieup_information, customer } = req.body;

  Table.findById(req.params.id).then((table) => {
    if (table) {
      if (table.is_other_set) {
        CounterModel = CounterOtherSet;
      } else {
        CounterModel = Counter;
      }

      CounterModel.increment("orders").then(({ next }) => {
        const order = {
          user: req.body.user,
          items: req.body.order,
          datetime: moment.tz(moment(), process.env.TIMEZONE),
          order_id: next,
        };

        table.customer = customer;
        table.tieup_information = tieup_information;

        const orders = table.orders ? table.orders : [];

        table.orders = [...orders, order];
        delete table.__v;

        Order.create({
          ...order,
          table: {
            ...table,
          },
        });

        table
          .save()
          .then((table) => {
            /* incrementInventoryFromOrders(order); */
            /**
             * get orders
             */

            Table.aggregate([
              {
                $match: {
                  "orders.order_id": order.order_id,
                  name: table.name,
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
                $project: {
                  item: "$orders.items",
                  order_id: "$orders.order_id",
                },
              },
              {
                $match: {
                  order_id: order.order_id,
                },
              },
              {
                $match: {
                  "item.product.category.station": {
                    $exists: true,
                    $ne: null,
                  },
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
            ])
              .allowDiskUse(true)
              .then((stations) => {
                printOrderSlip({ stations, order, table });

                //for dispatching
                printForDispatching({ order, table });
              })
              .catch((err) => console.log(err));

            return res.json(table);
          })
          .catch((err) => console.log(err));
      });
    } else {
      console.log("ID not found");
    }
  });
});

router.post("/:id/update", (req, res) => {
  const newTable = req.body.table;

  Table.findById(newTable._id).then((table) => {
    table
      .set({
        ...newTable,
      })
      .save()
      .then((table) => {
        /**
         * FOR UPDATING ORDER
         */

        /* if (old_order && updated_order) {
          incrementInventoryFromUpdatingOrder(
            old_order,
            constants.DECREMENT
          ).then(() => {
            incrementInventoryFromUpdatingOrder(
              updated_order,
              constants.INCREMENT
            );
          });
        }
 */
        /* if (deleted_order) {
          incrementInventoryFromUpdatingOrder(
            deleted_order,
            constants.DECREMENT
          );
        } */

        return res.json(table);
      })
      .catch((err) => console.log(err));
  });
});

router.post("/:id/update-tieup", (req, res) => {
  const newTable = req.body.table;
  const tieup_information = req.body.table.tieup_information;

  Table.findById(newTable._id).then((table) => {
    //update product prices in each order

    const orders = (table.orders || []).map((order) => {
      const items = (order.items || []).map((item) => {
        const tieup_prices = [...(item.product.tieup_prices || [])];
        const tieup_index = tieup_prices.findIndex(
          (o) => o.tieup._id.toString() === tieup_information.tieup._id
        );

        let { price, amount, quantity } = item;

        if (tieup_index >= 0) {
          price = tieup_prices[tieup_index].price;
        }

        amount = round(price * quantity);

        return {
          ...item,
          price,
          quantity,
          amount,
        };
      });
      return {
        ...order.toObject(),
        items,
      };
    });

    table
      .set({
        ...newTable,
        orders,
      })
      .save()
      .then((table) => {
        return res.json(table);
      })
      .catch((err) => res.status(401).json(err));
  });
});

router.post("/:id/transfer", (req, res) => {
  const newTable = req.body.newTable;

  Table.findById(req.params.id)
    .then((table) => {
      if (table) {
        // set orders to new table

        const summary = {
          is_sc: 0,
          discount_rate: 0,
          ...table.summary,
        };

        Table.findByIdAndUpdate(
          newTable._id,
          {
            $set: {
              orders: table.orders,
              payments: table.payments,
              summary,
              customer: table.customer,
              tieup_information: table.tieup_information,
            },
          },
          {
            new: true,
          }
        )
          .then(async (newTable) => {
            // unset old table

            await Table.updateOne(
              {
                _id: table._id,
              },
              {
                $set: {
                  orders: [],
                  customer: {},
                  tieup_information: {},
                  payments: {},
                  summary: {
                    is_sc: 0,
                    discount_rate: 0,
                  },
                },
              }
            ).exec();

            res.send(newTable);
          })
          .catch((err) => console.log(err));
      }
    })
    .catch((err) => console.log(err));
});

router.post("/:id/cancel", (req, res) => {
  const user = req.body.user;
  const authorized_by = req.body.authorized_by;
  Table.findOne({
    _id: req.params.id,
  }).then((table) => {
    if (!table.is_other_set) {
      recordCancelledOrders(table, user, authorized_by);
    }

    table.orders = null;
    table.summary = null;
    table.payments = null;
    table.customer = null;
    table.tieup_information = null;
    table
      .save()
      .then((table) => {
        /**
         * if temporary table, delete table
         */

        if (table.is_temporary_table) {
          Table.deleteOne({
            _id: table._id,
          }).exec();
        }

        return res.json({ success: 1 });
      })
      .catch((err) => res.status(401).json(err));
  });
});

router.post("/:id/summary", (req, res) => {
  Table.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        summary: req.body.summary,
      },
    },
    {
      new: true,
    }
  )
    .then((table) => res.json(table))
    .catch((err) => res.status(401).json(err));
});

router.post("/:id/remove-tieup", async (req, res) => {
  await Table.updateOne(
    { _id: ObjectId(req.params.id) },
    {
      $unset: {
        tieup_information: null,
      },
    }
  ).exec();

  Table.findOne({ _id: ObjectId(req.params.id) }).then((table) => {
    //update product prices in each order
    const orders = (table.orders || []).map((order) => {
      const items = (order.items || []).map((item) => {
        let { product, amount, quantity } = item;

        amount = round(product.price * quantity);

        return {
          ...item,
          price: product.price,
          quantity,
          amount,
        };
      });
      return {
        ...order.toObject(),
        items,
      };
    });

    table
      .set({
        orders,
      })
      .save()
      .then((table) => {
        return res.json(table);
      })
      .catch((err) => res.status(401).json(err));
  });
});

router.post("/:id/print", (req, res) => {
  onPrintBill(req, res);
});

onPrintBill = (req, res) => {
  printBill(req)
    .then(() => {
      return res.json({ success: 1 });
    })
    .catch((err) => {
      console.log(err);
      return res.status(401).json(err);
    });
};

router.post("/reprint-order", (req, res) => {
  const order = req.body.order;
  const order_id = req.body.order.order_id;
  const table = req.body.table;
  async.parallel(
    {
      stations: (cb) => {
        Table.aggregate([
          {
            $match: {
              "orders.order_id": order_id,
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
            $project: {
              item: "$orders.items",
              order_id: "$orders.order_id",
            },
          },
          {
            $match: {
              order_id: order_id,
            },
          },
          {
            $match: {
              "item.product.category.station": {
                $exists: true,
                $ne: null,
              },
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
        ])
          .allowDiskUse(true)
          .exec(cb);
      },
      table: (cb) => {
        Table.findById(table._id).exec(cb);
      },
    },
    (err, result) => {
      const stations = result.stations;
      const table = result.table;

      printOrderSlip({ stations, order, table, is_reprint: true });

      //for dispatching
      printForDispatching({ order, table, is_reprint: true });

      return res.json({ success: 1 });
    }
  );
});

router.post("/deleted-orders", async (req, res) => {
  const { from_datetime, to_datetime } =
    await report_functions.getPeriodFromRequest({
      from_date: req.body.period_covered[0],
      to_date: req.body.period_covered[1],
    });

  DeletedOrder.find({
    datetime: {
      $gte: from_datetime.toDate(),
      $lte: to_datetime.toDate(),
    },
  }).then((records) => {
    return res.json({
      records,
      from_datetime,
      to_datetime,
    });
  });
});

router.post("/split", async (req, res) => {
  const table = req.body.table;
  const transfer_table = req.body.transfer_table;
  const name = req.body.name;

  const newTable = new Table({
    name,
    payments: null,
    summary: null,
    orders: [...transfer_table.orders],
    is_temporary_table: true,
  });
  newTable.save().then((newTable) => {
    Table.findById(table._id).then((old_table) => {
      if (old_table) {
        old_table.set({
          ...table,
        });
        old_table.save();
      }
      return res.json(old_table);
    });
  });
});

router.post("/merge", (req, res) => {
  const from_tables = req.body.from_tables;
  let to_table = req.body.to_table;

  from_tables.forEach((table) => {
    table.orders.forEach((order) => {
      to_table.orders = [
        ...to_table.orders,
        {
          ...order,
        },
      ];
    });
    clearTableOrders(table);
  });
  Table.findById(to_table._id).then((table) => {
    table.orders = [...to_table.orders];
    table.save().then(() => {
      return res.json({ success: 1 });
    });
  });
});

clearTableOrders = (table) => {
  Table.findById(table._id).then((table) => {
    delete table.payments;
    delete table.summary;
    table.orders = [];
    table.save().then((table) => {
      if (table.is_temporary_table) {
        Table.deleteOne({
          _id: table._id,
        }).exec();
      }
    });
  });
};

router.post("/delete-order", (req, res) => {
  const form_data = {
    ...req.body,
  };

  form_data["deleted"] = {
    ...form_data["deleted"],
    datetime: moment.tz(moment(), process.env.TIMEZONE),
  };

  const deletedOrder = new DeletedOrder({
    ...form_data,
  });

  deletedOrder.save().then((newDeletedOrder) => {
    return res.json(newDeletedOrder);
  });
});

router.post("/:id", (req, res) => {
  const { isValid, errors } = validateTableInput(req.body);

  if (!isValid) {
    return res.status(401).json(errors);
  }

  Table.findById(req.params.id).then((table) => {
    if (table) {
      table.set({
        name: req.body.name,
        is_other_set: req.body.is_other_set,
      });
      table
        .save()
        .then((table) => res.json(table))
        .catch((err) => res.status(401).json(err));
    } else {
      console.log("ID not found");
    }
  });
});

router.delete("/:id/clear", async (req, res) => {
  const table = await Table.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        orders: [],
      },
      $unset: {
        summary: null,
        payments: null,
        customer: null,
        tieup_information: null,
      },
    },
    {
      new: true,
    }
  );

  if (table.is_temporary_table) {
    await Table.deleteOne({
      _id: table._id,
    }).exec();
  }

  return res.json({ success: 1 });
});

router.delete("/:id", (req, res) => {
  Table.findByIdAndRemove(req.params.id)
    .then((response) => res.json({ success: 1 }))
    .catch((err) => res.status(401).json(err));
});

const printBill = (req) => {
  return new Promise((resolve, reject) => {
    let label, amount, space;

    const summary = req.body.summary;
    const payments = req.body.payments;
    const user = req.body.user;

    const net_amount = round(summary.amount_due);

    Table.findById(req.params.id).then(async (table) => {
      if (table) {
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
            `Time        : ${moment.tz(process.env.TIMEZONE).format("LLL")}\n`
          );
          printer.print(`Table #     : ${table.name}\n`);

          if (user.name) {
            printer.print(`Cashier     : ${user.name}\n`);
          }

          if (table.customer && table.customer.name) {
            const customer = table.customer;
            printer.print(`Customer    : ${customer.name || ""}\n`);
            printer.print(`Address     : ${customer.address || ""}\n`);
            printer.print(`Contact No. : ${customer.contact_no || ""}\n`);
            printer.print(`Pickup Time : ${customer.time || ""}\n`);
          }

          if (
            table.tieup_information &&
            table.tieup_information.tieup &&
            table.tieup_information.tieup.name
          ) {
            const tieup_information = table.tieup_information;
            printer.print(
              `Tieup        : ${tieup_information.tieup.name || ""}\n`
            );
            printer.print(
              `Booking Ref. : ${tieup_information.booking_reference || ""}\n`
            );
          }

          printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
          table.orders.forEach((order, order_index) => {
            if (order.user && order.user.name) {
              printer.print(
                `${escpos.BOLD}Waiter : ${order.user.name} / OS# : ${order.order_id}\n${escpos.BOLD_OFF}`
              );
            }

            order.items.forEach((item, index) => {
              const item_name = `${item.product.name}`;
              const item_amount = numberFormat(item.amount);
              /* const space = " ".repeat(
              process.env.LINE_MAX_CHAR - item_name.length - item_amount.length
            ); */

              /* printer.print(
              `${item_name}${escpos.CARRIAGE_RETURN}${
                escpos.ALIGN_RIGHT
              }${numberFormat(item.amount)}\n`
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

              printer.print(escpos.ALIGN_LEFT);
              printer.print(
                `    ${item.quantity} @ ${numberFormat(item.price)}\n`
              );
            });

            if (order_index < table.orders.length - 1) {
              printer.print("\n");
            }
          });

          printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

          printer.print(
            printLabelAmountFormat({
              label: `SUBTOTAL`,
              amount: summary.subtotal,
            })
          );

          if (summary.is_sc === 1) {
            printer.print(
              printLabelAmountFormat({
                label: `  LESS VAT DEDUCTION`,
                amount: summary.less_vat,
              })
            );

            printer.print(
              printLabelAmountFormat({
                label: `  LESS SC DISC`,
                amount: summary.less_sc_disc,
              })
            );
          }

          if (summary.discount_rate > 0) {
            printer.print(
              printLabelAmountFormat({
                label: `  LESS DISC`,
                amount: summary.discount_amount,
              })
            );
          }

          if (payments.credit_cards && payments.credit_cards.length > 0) {
            printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

            payments.credit_cards.forEach((credit_card) => {
              if (
                !isEmpty(credit_card.card) &&
                !isEmpty(credit_card?.card_number)
              ) {
                printer.print(
                  printLabelAmountFormat({
                    label: `${
                      credit_card.card
                    }/${credit_card.card_number.substring(
                      credit_card.card_number.length - 4
                    )}`,
                    amount: credit_card.amount,
                  })
                );
              }
            });
          }

          if (payments.gift_checks && payments.gift_checks.length > 0) {
            printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

            payments.gift_checks.forEach((gift_check) => {
              printer.print(
                printLabelAmountFormat({
                  label: `GC#${gift_check.items.gift_check_number.toString()}`,
                  amount: gift_check.items.amount,
                })
              );
            });
          }

          if (payments.account) {
            printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);
            printer.print(`ACCOUNT: ${payments.account.name}\n`);
            printer.print(
              printLabelAmountFormat({
                label: ``,
                amount: payments.account.account_credit,
              })
            );
          }

          printer.print(`${"-".repeat(process.env.LINE_MAX_CHAR)}\n`);

          label = `AMOUNT DUE`;
          amount = numberFormat(round(net_amount));
          space = " ".repeat(
            process.env.LINE_MAX_CHAR - label.length - amount.length
          );

          /* printer.print(`${label}${space}${escpos.EMPHASIZE}${amount}\n`);
        printer.print(escpos.INITALIZE); */

          printer.print(
            `${label}${escpos.CARRIAGE_RETURN}${escpos.ALIGN_RIGHT}${escpos.EMPHASIZE}${amount}\n`
          );
          printer.print(escpos.INITALIZE);

          if (summary.is_sc) {
            printer.print("SC DISCOUNT DETAILS\n");
            summary.seniors.forEach((senior) => {
              printer.print(
                `[SC]${senior.senior_name.padEnd(20)}${senior.senior_number}\n`
              );
            });
          }

          printer.print(escpos.INITALIZE);
          printer.print(escpos.ALIGN_CENTER);
          printer.print("\n\n");
          printer.print("THIS IS NOT YOUR OFFICIAL RECEIPT\n\n");
          printer.print("THIS DOCUMENT IS NOT VALID\nFOR CLAIM OF INPUT TAX\n");
          printer.print("\n\n\n\n\n\n");
          printer.print(escpos.CUT);
          printer.print(escpos.INITALIZE);
          printer.close();
        });
      } else {
        console.log("ID not found");
      }
    });
  });
};

const printOrderSlip = ({
  stations,
  order,
  table,
  is_reprint = false,
  for_dispatch = false,
}) => {
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

    if (is_reprint) {
      printer.print("REPRINT\n");
    }

    if (for_dispatch) {
      printer.print("FOR DISPATCHING\n");
    }

    printer.print("\n");
    printer.print(escpos.INITALIZE);
    printer.print(`Time : ${moment.tz(process.env.TIMEZONE).format("LLL")}\n`);
    printer.print(`Table # : ${table.name}\n`);
    printer.print(`Order # : ${order.order_id}\n`);

    if (order.user && order.user.name) {
      printer.print(`Waiter : ${order.user.name}\n`);
    }

    printer.print(`Station : ${line_station.station.name}\n`);

    printer.print(escpos.EMPHASIZE);
    if (table.customer && table.customer.name) {
      const customer = table.customer;
      if (customer && customer.name) printer.print(`${customer.name || ""}\n`);

      /* if (customer && customer.address)
        printer.print(`Address     : ${customer.address || ""}\n`); */

      /* if (customer && customer.contact_no)
        printer.print(`Contact No. : ${customer.contact_no || ""}\n`); */

      if (customer && customer.time) printer.print(`${customer.time || ""}\n`);
    }

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

const printForDispatching = async ({ order, table, is_reprint = false }) => {
  const dispatch_unit_ip = await getSettingValueFromKey(
    constants.DISPATCH_UNIT_IP
  );

  Table.aggregate([
    {
      $match: {
        "orders.order_id": order.order_id,
        name: table.name,
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
      $project: {
        item: "$orders.items",
        order_id: "$orders.order_id",
      },
    },
    {
      $match: {
        order_id: order.order_id,
      },
    },
    {
      $match: {
        "item.product.category.print_duplicate_in_dispatcher": true,
      },
    },
    {
      $group: {
        _id: null,
        station_orders: {
          $push: "$item",
        },
      },
    },
    {
      $addFields: {
        station: {
          printer: {
            line_max_char: constants.THERMAL_LINE_MAX_CHAR,
          },
          ip_address: dispatch_unit_ip,
          name: "DISPATCH",
        },
      },
    },
  ])
    .allowDiskUse(true)
    .then((stations) => {
      printOrderSlip({
        stations,
        order,
        table,
        for_dispatch: true,
        is_reprint,
      });
    });
};

module.exports = router;
