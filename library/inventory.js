const mongoose = require("mongoose");
const moment = require("moment");
const PurchaseOrder = require("./../models/PurchaseOrder");
const Stock = require("./../models/Product");
const Sales = require("./../models/Sales");
const StockReleasing = require("./../models/StockReleasing");
const InventoryAdjustment = require("./../models/InventoryAdjustment");
const PhysicalCount = require("./../models/PhysicalCount");
const StockReceiving = require("./../models/StockReceiving");
const StockTransfer = require("./../models/StockTransfer");
const PurchaseReturn = require("./../models/PurchaseReturn");
const SalesReturn = require("./../models/SalesReturns");
const Supplier = require("./../models/Supplier");
const Wastage = require("./../models/Wastage");
const Production = require("./../models/Production");
const constants = require("../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const isEmpty = require("./../validators/is-empty");
const round = require("./../utils/round");

const numeral = require("numeral");
const async = require("async");
const { getAverageCostOfStock } = require("./update_functions");
const DeliveryReceipt = require("../models/DeliveryReceipt");
const forOwn = require("lodash").forOwn;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const orderBy = require("lodash").orderBy;

/**
 * REASSIGN ITEMS
 */
const ObjectId = mongoose.Types.ObjectId;
module.exports.reassignItem = async (old_stock_id, new_stock_id) => {
  const old_stock = await Stock.findOne({
    _id: mongoose.Types.ObjectId(old_stock_id),
  });

  const new_stock = await Stock.findOne({
    _id: mongoose.Types.ObjectId(new_stock_id),
  });

  await PurchaseRequest.updateMany(
    {
      "items.stock._id": old_stock._id,
    },
    {
      $set: {
        "items.$.stock": {
          ...new_stock.toObject(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();

  await PurchaseOrder.updateMany(
    {
      "items.stock._id": old_stock._id,
    },
    {
      $set: {
        "items.$.stock": {
          ...new_stock.toObject(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();

  await StockReceiving.updateMany(
    {
      "items.stock._id": old_stock._id,
    },
    {
      $set: {
        "items.$.stock": {
          ...new_stock.toObject(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();

  await StockTransfer.updateMany(
    {
      "items.stock._id": old_stock._id,
    },
    {
      $set: {
        "items.$.stock": {
          ...new_stock.toObject(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();
};

/**
 * GET DOCUEMNT COUNT FOR STOCK
 */

module.exports.getDocumentCount = (stock) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        purchase_order: (cb) => {
          PurchaseOrder.countDocuments({
            "items.stock._id": stock._id,
          }).exec(cb);
        },
      },
      (err, results) => {
        /* if (err) {
          reject(err);
          return;
        } */
        const count = numeral(0);
        forOwn(results, (value, key) => {
          count.add(value);
        });

        resolve({
          ...results,
          count: count.value(),
        });
      }
    );
  });
};

module.exports.updateAllStockTransactions = async (stock) => {
  const Models = [
    PurchaseOrder,
    StockReceiving,
    StockTransfer,
    StockReleasing,
    PurchaseReturn,
    Wastage,
  ];

  Stock.find().then((stocks) => {
    async.each(stocks, (stock) => {
      async.each(Models, (Model) => {
        Model.updateMany(
          {
            "items.stock._id": stock._id,
          },
          {
            $set: {
              "items.$.stock": {
                ...stock.toObject(),
              },
            },
          },
          {
            multi: true,
          }
        ).exec();
      });
    });
  });
};

/**
 * UPDATE TRANSACTIONS OF STOCK UPON UPDATE OF STOCK INFORMATION
 */

module.exports.updateStockTransactions = (stock) => {
  const Models = [PurchaseOrder, StockReceiving, StockTransfer];

  async.each(Models, (Model) => {
    Model.updateMany(
      {
        "items.stock._id": stock._id,
      },
      {
        $set: {
          "items.$.stock": {
            ...stock,
          },
        },
      },
      {
        multi: true,
      }
    ).exec();
  });
};

/**
 * RECEIVING REPORT
 */

module.exports.incrementPurchaseOrderFromReceivingReport = (record) => {
  return new Promise((resolve, reject) => {
    const items = [...record.items];
    items.forEach(async (item) => {
      if (item.quantity) {
        let query = {
          _id: mongoose.Types.ObjectId(record.purchase_order._id),
          "items.stock._id": item.stock._id,
          "items.price": item.price,
        };

        let update = {
          $inc: {
            "items.$.received_quantity": item.quantity,
          },
        };

        await PurchaseOrder.updateOne(query, update);
      }
    });

    resolve(1);
  });
};

module.exports.updatePurchaseOrderFromReceivingReport = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_items = [...old_record.items];
    await asyncForeach(old_items, async (item) => {
      if (item.quantity) {
        let query = {
          _id: mongoose.Types.ObjectId(new_record.purchase_order._id),
          "items.stock._id": item.stock._id,
          "items.price": item.price,
        };

        let update = {
          $inc: {
            "items.$.received_quantity": 0 - parseFloat(item.quantity),
          },
        };

        await PurchaseOrder.updateOne(query, update);
      }
    });

    const new_items = [...new_record.items];
    await asyncForeach(new_items, async (item) => {
      if (item.quantity) {
        let query = {
          _id: mongoose.Types.ObjectId(new_record.purchase_order._id),
          "items.stock._id": item.stock._id,
          "items.price": item.price,
        };

        let update = {
          $inc: {
            "items.$.received_quantity": parseFloat(item.quantity),
          },
        };

        await PurchaseOrder.updateOne(query, update);
      }
    });

    resolve(1);
  });
};

module.exports.deductPurchaseOrderFromReceivingReport = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    await asyncForeach(items, async (item) => {
      if (item.quantity) {
        let query = {
          _id: mongoose.Types.ObjectId(record.purchase_order._id),
          "items.stock._id": item.stock._id,
          "items.price": item.price,
        };

        let update = {
          $inc: {
            "items.$.received_quantity": 0 - parseFloat(item.quantity),
          },
        };
        await PurchaseOrder.updateOne(query, update);
      }
    });

    resolve(1);
  });
};

module.exports.updatePoStatus = (purchase_order) => {
  return new Promise((resolve, reject) => {
    PurchaseOrder.findOne({
      _id: ObjectId(purchase_order._id),
    }).then((record) => {
      //check if all are received quantity are 0
      if (record) {
        let po_status = constants.PO_STATUS_PENDING;

        let items = [...record.items].filter(
          (o) =>
            (o.confirmed_quantity || 0) < o.quantity && o.confirmed_quantty > 0
        );

        if (items.length > 0) {
          po_status = constants.PO_STATUS_PARTIAL;
        }

        items = [...record.items].filter(
          (o) => (o.confirmed_quantity || 0) >= o.quantity
        );

        if (items.length === record.items.length) {
          po_status = constants.PO_STATUS_ACCOMPLISHED;
        }

        record.po_status = po_status;
        record.save();
      }

      resolve(true);
    });
  });
};

module.exports.computeBalance = ({
  disc_beg_bal = 0,
  beg_bal = 0,
  deliveries = 0,
  disc_deliveries = 0,
  production = 0,
  transmittals = 0,
  disc_transmittals = 0,
  conversion = 0,
  sales = 0,
  disc_sales = 0,
  pull_out = 0,
  end_bal = 0,
}) => {
  const total = numeral(0);
  total.add(disc_beg_bal);
  total.add(beg_bal);
  total.add(deliveries);
  total.add(disc_deliveries);
  total.add(production);
  total.subtract(transmittals);
  total.subtract(disc_transmittals);
  total.add(conversion);
  total.subtract(sales);
  total.subtract(disc_sales);
  total.subtract(pull_out);

  const computed_bal = total.value();
  const variance = end_bal - total.value();

  return {
    computed_bal,
    variance,
  };
};

module.exports.updateSalesFromInvoices = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];

    await asyncForeach(items, async (item) => {
      let query = {
        _id: ObjectId(item._id),
      };

      let update = {
        $set: {
          invoice: record,
        },
      };

      await Sales.updateOne(query, update).exec();
    });

    resolve(1);
  });
};

module.exports.updateSalesFromInvoiceUpdate = ({ old_record, new_record }) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_items = [...old_record.items];
    await asyncForeach(old_items, async (item) => {
      let query = {
        _id: mongoose.Types.ObjectId(item._id),
      };

      let update = {
        $unset: {
          invoice: null,
        },
      };

      await Sales.updateOne(query, update).exec();
    });

    const new_items = [...new_record.items];
    await asyncForeach(new_items, async (item) => {
      let query = {
        _id: mongoose.Types.ObjectId(item._id),
      };

      let update = {
        $set: {
          invoice: new_record,
        },
      };

      await Sales.updateOne(query, update).exec();
    });

    resolve(1);
  });
};

module.exports.updateSalesFromDeleteInvoice = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    await asyncForeach(items, async (item) => {
      let query = {
        _id: ObjectId(item._id),
      };

      let update = {
        $unset: {
          invoice: null,
        },
      };

      await Sales.updateOne(query, update).exec();
    });

    resolve(1);
  });
};

/**
 * Collections
 */

module.exports.updateInvoicesFromCollection = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];

    await asyncForeach(items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: item.payment_amount,
          },
        };

        await Invoice.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updateInvoiceFromCollectionUpdate = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_items = [...old_record.items];
    await asyncForeach(old_items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: 0 - item.payment_amount,
          },
        };

        await Invoice.updateOne(query, update).exec();
      }
    });

    const new_items = [...new_record.items];
    await asyncForeach(new_items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: item.payment_amount,
          },
        };

        await Invoice.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updateInvoiceFromDeleteCollection = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    await asyncForeach(items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: 0 - item.payment_amount,
          },
        };

        await Invoice.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

/**
 * Disbursements
 */

module.exports.updateStocksReceivingFromDisbursements = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];

    await asyncForeach(items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: item.payment_amount,
          },
        };

        await StockReceiving.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updateStocksReceivingFromDisbursementsUpdate = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_items = [...old_record.items];
    await asyncForeach(old_items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: 0 - item.payment_amount,
          },
        };

        await StockReceiving.updateOne(query, update).exec();
      }
    });

    const new_items = [...new_record.items];
    await asyncForeach(new_items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: item.payment_amount,
          },
        };

        await StockReceiving.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updateStocksReceivingFromDeleteDisbursements = (record) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    await asyncForeach(items, async (item) => {
      if (item.payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_payment_amount: 0 - item.payment_amount,
          },
        };

        await StockReceiving.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

/**
 * Purchase Returns
 */

module.exports.updatePurchaseReturnsFromDisbursements = (record) => {
  return new Promise(async (resolve, reject) => {
    const creditable_items = [...record.creditable_items];

    await asyncForeach(creditable_items, async (item) => {
      if (item.credit_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_amount: item.credit_amount,
          },
        };
        await PurchaseReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updatePurchaseReturnsFromDisbursementsUpdate = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_creditable_items = [...old_record.creditable_items];
    await asyncForeach(old_creditable_items, async (item) => {
      if (item.credit_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_amount: 0 - item.credit_amount,
          },
        };
        await PurchaseReturn.updateOne(query, update).exec();
      }
    });

    const new_creditable_items = [...new_record.creditable_items];
    await asyncForeach(new_creditable_items, async (item) => {
      if (item.credit_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_amount: item.credit_amount,
          },
        };

        await PurchaseReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updatePurchaseReturnsFromDeleteDisbursements = (record) => {
  return new Promise(async (resolve, reject) => {
    const creditable_items = [...record.creditable_items];
    await asyncForeach(creditable_items, async (item) => {
      if (item.credit_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_amount: 0 - item.credit_amount,
          },
        };

        await PurchaseReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

/**
 * Disburseemnts -> PO
 * Advance Payment
 */

module.exports.updatePOFromDisbursement = (record) => {
  return new Promise(async (resolve, reject) => {
    const po_advance_payment_items = [...record.po_advance_payment_items];

    await asyncForeach(po_advance_payment_items, async (item) => {
      if (item.advance_payment) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_advance_payment: item.advance_payment,
          },
        };
        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    /**
     * Creditable advance payments
     */

    const creditable_advance_payment_items = [
      ...record.creditable_advance_payment_items,
    ];

    await asyncForeach(creditable_advance_payment_items, async (item) => {
      if (item.credit_advance_payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_advance_payment: item.credit_advance_payment_amount,
          },
        };
        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updatePOFromDisbursementUpdate = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_po_advance_payment_items = [
      ...old_record.po_advance_payment_items,
    ];
    await asyncForeach(old_po_advance_payment_items, async (item) => {
      if (item.advance_payment) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_advance_payment: 0 - item.advance_payment,
          },
        };
        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    const new_po_advance_payment_items = [
      ...new_record.po_advance_payment_items,
    ];
    await asyncForeach(new_po_advance_payment_items, async (item) => {
      if (item.advance_payment) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_advance_payment: item.advance_payment,
          },
        };

        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    /**
     * CREDITABLE ADVANCE PAYMENTS
     */

    const old_creditable_advance_payment_items = [
      ...old_record.old_creditable_advance_payment_items,
    ];
    await asyncForeach(old_creditable_advance_payment_items, async (item) => {
      if (item.credit_advance_payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_advance_payment:
              0 - item.credit_advance_payment_amount,
          },
        };
        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    const new_creditable_advance_payment_items = [
      ...new_record.creditable_advance_payment_items,
    ];
    await asyncForeach(new_creditable_advance_payment_items, async (item) => {
      if (item.credit_advance_payment_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_advance_payment: item.credit_advance_payment_amount,
          },
        };

        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updatePOFromDisbursementDelete = (record) => {
  return new Promise(async (resolve, reject) => {
    const po_advance_payment_items = [...record.po_advance_payment_items];
    await asyncForeach(po_advance_payment_items, async (item) => {
      if (item.advance_payment) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_advance_payment: 0 - item.advance_payment,
          },
        };

        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    /**
     * Creditable advance payment
     */

    const creditable_advance_payment_items = [
      ...record.creditable_advance_payment_items,
    ];
    await asyncForeach(creditable_advance_payment_items, async (item) => {
      if (item.credit_advance_payment_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_credit_advance_payment:
              0 - item.credit_advance_payment_amount,
          },
        };

        await PurchaseOrder.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

/**
 * Invoices /  Sales Returns
 */

/**
 * Purchase Returns
 */

module.exports.updateSalesReturnsFromInvoice = (record) => {
  return new Promise(async (resolve, reject) => {
    const debitable_items = [...record.debitable_items];

    await asyncForeach(debitable_items, async (item) => {
      if (item.debit_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_debit_amount: item.debit_amount,
          },
        };
        await SalesReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.udpateSalesReturnFromInvoiceUpdate = ({
  old_record,
  new_record,
}) => {
  return new Promise(async (resolve, reject) => {
    /**
     * decremting records on old record
     */

    const old_debitable_items = [...old_record.debitable_items];
    await asyncForeach(old_debitable_items, async (item) => {
      if (item.debit_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_debit_amount: 0 - item.debit_amount,
          },
        };
        await SalesReturn.updateOne(query, update).exec();
      }
    });

    const new_debitable_items = [...new_record.debitable_items];
    await asyncForeach(new_debitable_items, async (item) => {
      if (item.debit_amount) {
        let query = {
          _id: mongoose.Types.ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_debit_amount: item.debit_amount,
          },
        };

        await SalesReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.updateSalesReturnFromDeleteInvoice = (record) => {
  return new Promise(async (resolve, reject) => {
    const debitable_items = [...record.debitable_items];
    await asyncForeach(debitable_items, async (item) => {
      if (item.debit_amount) {
        let query = {
          _id: ObjectId(item._id),
        };

        let update = {
          $inc: {
            total_debit_amount: 0 - item.debit_amount,
          },
        };

        await SalesReturn.updateOne(query, update).exec();
      }
    });

    resolve(1);
  });
};

module.exports.getCustomerBalanceAsOfDate = (date, customer) => {
  return new Promise((resolve, reject) => {
    //get less than the given date

    const report_date = moment(date).startOf("day").toDate();

    async.parallel(
      {
        opening_balance: (cb) => {
          Customer.aggregate([
            {
              $match: {
                _id: ObjectId(customer._id),
                opening_balance_date: {
                  $lte: report_date,
                },
                opening_balance: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                _id: null,
                total_amount: "$opening_balance",
              },
            },
          ]).exec(cb);
        },

        sales: (cb) => {
          Sales.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "customer._id": ObjectId(customer._id),
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: "$total_amount",
                },
              },
            },
          ]).exec(cb);
        },

        sales_returns: (cb) => {
          SalesReturn.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "customer._id": ObjectId(customer._id),
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: {
                    $subtract: [0, "$total_amount"],
                  },
                },
              },
            },
          ]).exec(cb);
        },

        customer_collections: (cb) => {
          CustomerCollection.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "customer._id": ObjectId(customer._id),
                check_status: {
                  $ne: constants.CHECK_STATUS_BOUNCED,
                },
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: {
                    $subtract: [0, "$total_payment_amount"],
                  },
                },
              },
            },
          ]).exec(cb);
        },
      },
      async (err, results) => {
        if (err) {
          reject(err);
        }

        let total_amount = 0;

        forOwn(results, (value, key) => {
          total_amount += round(sumBy(value, (o) => o.total_amount));
        });

        resolve(total_amount || 0);
      }
    );
  });
};

module.exports.getCustomersListWithTransactions = (date) => {
  return new Promise((resolve, reject) => {
    const report_date = moment(date).endOf("day").toDate();

    async.parallel(
      {
        opening_balance: (cb) => {
          Customer.aggregate([
            {
              $match: {
                opening_balance_date: {
                  $lte: report_date,
                },
                opening_balance: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                _id: 1,
                customer: "$$ROOT",
              },
            },
          ]).exec(cb);
        },

        invoices: (cb) => {
          Invoice.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $addFields: {
                date: {
                  $cond: [
                    {
                      $eq: ["$due_date", null],
                    },
                    "$date",
                    "$due_date",
                  ],
                },
              },
            },
            {
              $match: {
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $group: {
                _id: "$customer._id",
                customer: {
                  $first: "$customer",
                },
              },
            },
          ]).exec(cb);
        },

        sales_returns: (cb) => {
          SalesReturn.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $group: {
                _id: "$customer._id",
                customer: {
                  $first: "$customer",
                },
              },
            },
          ]).exec(cb);
        },

        customer_collections: (cb) => {
          CustomerCollection.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
                check_status: {
                  $ne: constants.CHECK_STATUS_BOUNCED,
                },
              },
            },
            {
              $group: {
                _id: "$customer._id",
                customer: {
                  $first: "$customer",
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
        }

        let transactions = [];
        forOwn(results, (value, key) => {
          transactions = [...transactions, ...value];
        });

        let customers = uniqBy(transactions, (o) => o.customer._id.toString());
        customers = orderBy(customers, [(o) => o.customer.name], ["asc"]);

        resolve(customers);
      }
    );
  });
};

module.exports.getVendorBalanceAsOfDate = (date, supplier) => {
  return new Promise((resolve, reject) => {
    //get less than the given date
    const report_date = moment(date).startOf("day").toDate();

    async.parallel(
      {
        opening_balance: (cb) => {
          Supplier.aggregate([
            {
              $match: {
                _id: ObjectId(supplier._id),
                opening_balance_date: {
                  $lte: report_date,
                },
                opening_balance: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                _id: null,
                total_amount: "$opening_balance",
              },
            },
          ]).exec(cb);
        },

        stocks_receiving: (cb) => {
          StockReceiving.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "supplier._id": ObjectId(supplier._id),
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: "$total_amount",
                },
              },
            },
          ]).exec(cb);
        },

        purchase_returns: (cb) => {
          PurchaseReturn.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "supplier._id": ObjectId(supplier._id),
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: {
                    $subtract: [0, "$total_amount"],
                  },
                },
              },
            },
          ]).exec(cb);
        },

        disbursements: (cb) => {
          Disbursements.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lt: report_date,
                },
                "supplier._id": ObjectId(supplier._id),
              },
            },
            {
              $group: {
                _id: null,
                total_amount: {
                  $sum: {
                    $subtract: [0, "$total_payment_amount"],
                  },
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
        }

        let total_amount = 0;

        forOwn(results, (value, key) => {
          total_amount += round(sumBy(value, (o) => o.total_amount));
        });

        resolve(total_amount || 0);
      }
    );
  });
};

module.exports.getVendorListWithTransaction = (date) => {
  return new Promise((resolve, reject) => {
    const report_date = moment(date).endOf("day").toDate();

    async.parallel(
      {
        opening_balance: (cb) => {
          Supplier.aggregate([
            {
              $match: {
                opening_balance_date: {
                  $lte: report_date,
                },
                opening_balance: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                _id: 1,
                supplier: "$$ROOT",
              },
            },
          ]).exec(cb);
        },

        stocks_receiving: (cb) => {
          StockReceiving.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $group: {
                _id: "$supplier._id",
                supplier: {
                  $first: "$supplier",
                },
              },
            },
          ]).exec(cb);
        },

        purchase_returns: (cb) => {
          PurchaseReturn.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $group: {
                _id: "$supplier._id",
                supplier: {
                  $first: "$supplier",
                },
              },
            },
          ]).exec(cb);
        },

        disbursements: (cb) => {
          Disbursements.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $group: {
                _id: "$supplier._id",
                supplier: {
                  $first: "$supplier",
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
        }

        let transactions = [];
        forOwn(results, (value, key) => {
          transactions = [...transactions, ...value];
        });

        let suppliers = uniqBy(transactions, (o) => o.supplier._id.toString());

        resolve(suppliers);
      }
    );
  });
};

module.exports.getVendorTransactionsAsOfDate = (date) => {
  return new Promise((resolve, reject) => {
    const report_date = moment(date).endOf("day").toDate();

    async.parallel(
      {
        opening_balance: (cb) => {
          Supplier.aggregate([
            {
              $match: {
                opening_balance_date: {
                  $lte: report_date,
                },
                opening_balance: {
                  $gt: 0,
                },
              },
            },
            {
              $project: {
                type: "Opening Balance",
                date: "$opening_balance_date",
                ref_no: "",
                supplier: "$$ROOT",
                amount: "$opening_balance",
              },
            },
          ]).exec(cb);
        },

        stocks_receiving: (cb) => {
          StockReceiving.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $project: {
                type: "Stocks Receiving",
                date: 1,
                ref_no: "$rr_no",
                supplier: "$supplier",
                amount: "$total_amount",
              },
            },
          ]).exec(cb);
        },

        purchase_returns: (cb) => {
          PurchaseReturn.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $project: {
                type: "Purchase Returns",
                date: 1,
                ref_no: "$pr_no",
                supplier: "$supplier",
                amount: {
                  $subtract: [0, "$total_amount"],
                },
              },
            },
          ]).exec(cb);
        },

        disbursements: (cb) => {
          Disbursements.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $project: {
                type: "Disbursements",
                date: 1,
                ref_no: "$dv_no",
                supplier: "$supplier",
                amount: {
                  $subtract: [0, "$total_payment_amount"],
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
        }

        let transactions = [];
        forOwn(results, (value, key) => {
          transactions = [...transactions, ...value];
        });
        const now = moment(date);

        transactions = transactions.map((o) => {
          const aging = Math.floor(moment.duration(now.diff(o.date)).asDays());

          return {
            ...o,
            aging,
          };
        });
        transactions = orderBy(transactions, ["date"], ["asc"]);

        resolve(transactions);
      }
    );
  });
};

module.exports.getCustomerTransactionsAsOfDate = (date, customer = null) => {
  return new Promise((resolve, reject) => {
    const report_date = moment(date).endOf("day").toDate();

    async.parallel(
      {
        delivery_receipts: (cb) => {
          DeliveryReceipt.aggregate([
            {
              $match: {
                "status.approval_status": {
                  $nin: ["Paid", "Cancelled"],
                },
                ...(customer && {
                  "customer._id": ObjectId(customer._id),
                }),
                date: {
                  $lte: report_date,
                },
              },
            },
            {
              $addFields: {
                dr_date: "$date",
                date: {
                  $cond: [
                    {
                      $eq: ["$due_date", null],
                    },
                    "$date",
                    "$due_date",
                  ],
                },
                amount: {
                  $reduce: {
                    input: "$items",
                    initialValue: 0,
                    in: {
                      $add: ["$$value", "$$this.amount"],
                    },
                  },
                },
              },
            },
            {
              //compute for balance and overwrite amount if there are partial payments
              $addFields: {
                amount: {
                  $subtract: [
                    "$amount",
                    {
                      $ifNull: ["$total_payment_amount", 0],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                type: "Delivery Receipt",
                date: 1,
                ref_no: "$dr_no",
                dr_date: "$dr_date",
                si_no: "$si_no",
                customer: "$customer",
                amount: "$amount",
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
        }

        let transactions = [];
        forOwn(results, (value, key) => {
          transactions = [...transactions, ...value];
        });
        const now = moment(date);

        transactions = transactions.map((o) => {
          const aging = Math.floor(moment.duration(now.diff(o.date)).asDays());

          return {
            ...o,
            aging,
          };
        });
        transactions = orderBy(transactions, ["date"], ["asc"]);

        // console.log(transactions);

        /**
         * do not include items that is not due yet
         */

        resolve(transactions.filter((o) => o.aging >= 0));
      }
    );
  });
};

module.exports.updateItemsInCollection = ({
  record,
  ItemModel /* collection model to be updated */,
  item_collection /* collection key being referenced ; e.g. purchase_order (note the key should be present in the record) */,
  items_column_key /* key in the items collection to be inc; e.g received_quantity */,
  items_column_case_key /* key in the items collection to be inc; e.g received_quantity */,
  items_key = "items",
  case_quantity_key = "case_quantity",
  quantity_key = "quantity",
  is_inc = true,
}) => {
  return new Promise(async (resolve, reject) => {
    const items = [...record[items_key]];
    await asyncForeach(items, async (item) => {
      if (item[quantity_key] || item[case_quantity_key]) {
        let query = {
          _id: mongoose.Types.ObjectId(record[item_collection]._id),
          items: {
            $elemMatch: {
              "stock._id": item.stock._id,

              ...(item.price && {
                price: item.price,
              }),

              ...(item.case_price && {
                case_price: item.case_price,
              }),
            },
          },
        };
        const update_quanitty_key = `items.$.${items_column_key}`;

        const update_case_quantity_key = `items.$.${items_column_case_key}`;

        let case_quantity_ref;
        let quantity_ref;

        if (is_inc) {
          case_quantity_ref = item[case_quantity_key];
          quantity_ref = item[quantity_key];
        } else {
          quantity_ref = 0 - parseFloat(item[quantity_key]);
          case_quantity_ref = 0 - parseFloat(item[case_quantity_key]);
        }

        let update = {
          $inc: {
            [update_quanitty_key]: quantity_ref,
            [update_case_quantity_key]: case_quantity_ref,
          },
        };

        try {
          await ItemModel.updateOne(query, update);
        } catch (err) {
          return reject(err);
        }
      }
    });

    resolve(1);
  });
};

module.exports.updateSalesOrderStatus = ({ _id }) => {
  SalesOrder.findOne({
    _id: ObjectId(_id),
  }).then((record) => {
    const has_pending =
      record.items.filter((o) => o.quantity > o.total_quantity_sold).length > 0;

    if (has_pending) {
      record.set({
        sales_order_status: constants.STATUS_PENDING,
      });
    } else {
      record.set({
        sales_order_status: constants.STATUS_ACCOMPLISHED,
      });
    }

    record.save();
  });
};

module.exports.getInventoryTransactions = ({
  inventory_date,
  warehouse,
  stock,
}) => {
  return new Promise((resolve, reject) => {
    const date = inventory_date ? moment(inventory_date) : null;

    async.parallel(
      {
        ...(date && {
          physical_count: (cb) => {
            PhysicalCount.aggregate([
              {
                $match: {
                  date: {
                    $gte: date.clone().startOf("day").toDate(),
                    $lte: date.clone().endOf("day").toDate(),
                  },
                  "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                  deleted: {
                    $exists: false,
                  },
                  items: {
                    $elemMatch: {
                      $exists: true,
                    },
                  },
                },
              },
              {
                $unwind: {
                  path: "$items",
                },
              },
              {
                $addFields: {
                  "items.stock": {
                    $cond: [
                      {
                        //evaluates true if there is no unit product
                        $not: ["$items.stock.unit_product._id"],
                      },
                      "$items.stock",
                      "$items.stock.unit_product",
                    ],
                  },
                  "items.quantity": {
                    $multiply: [
                      "$items.quantity",
                      {
                        $ifNull: ["$items.stock.pieces_in_case", 1],
                      },
                    ],
                  },
                },
              },
              {
                $match: {
                  "items.stock": {
                    $exists: true,
                  },
                  ...(stock && {
                    "items.stock._id": ObjectId(stock._id),
                  }),
                },
              },
              {
                $group: {
                  _id: "$items.stock._id",
                  stock: {
                    $first: "$items.stock",
                  },
                  quantity: {
                    $sum: "$items.quantity",
                  },
                  case_quantity: {
                    $sum: "$items.case_quantity",
                  },
                },
              },
            ]).exec(cb);
          },
        }),

        receiving_report: (cb) => {
          StockReceiving.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),

                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        /* stock_release: (cb) => {
          StockReleasing.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),

                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
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
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },
 */
        sales: (cb) => {
          Sales.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  datetime: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),

                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.product": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.product.unit_product._id"],
                    },
                    "$items.product",
                    "$items.product.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    { $toDouble: "$items.quantity" },
                    {
                      $ifNull: ["$items.product.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.product": {
                  $exists: true,
                },
                ...(stock && {
                  "items.product._id": stock._id,
                }),
              },
            },
            {
              $group: {
                _id: "$items.product._id",
                stock: {
                  $first: "$items.product",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: 0,
                },
              },
            },
          ]).exec(cb);
        },
        sales_returns: (cb) => {
          SalesReturn.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  datetime: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),

                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.product": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.product.unit_product._id"],
                    },
                    "$items.product",
                    "$items.product.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    { $toDouble: "$items.quantity" },
                    {
                      $ifNull: ["$items.product.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.product": {
                  $exists: true,
                },
                ...(stock && {
                  "items.product._id": stock._id,
                }),
              },
            },
            {
              $group: {
                _id: "$items.product._id",
                stock: {
                  $first: "$items.product",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: 0,
                },
              },
            },
          ]).exec(cb);
        },

        purchase_return: (cb) => {
          PurchaseReturn.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        wastage: (cb) => {
          Wastage.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        inventory_adjustments: (cb) => {
          InventoryAdjustment.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        stock_transfer_in: (cb) => {
          StockTransfer.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "to_warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        stock_transfer_out: (cb) => {
          StockTransfer.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "from_warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$items",
              },
            },
            {
              $addFields: {
                "items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$items.stock.unit_product._id"],
                    },
                    "$items.stock",
                    "$items.stock.unit_product",
                  ],
                },
                "items.quantity": {
                  $multiply: [
                    "$items.quantity",
                    {
                      $ifNull: ["$items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$items.stock._id",
                stock: {
                  $first: "$items.stock",
                },
                quantity: {
                  $sum: "$items.quantity",
                },
                case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        consumed_production: (cb) => {
          Production.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                consumed_items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$consumed_items",
              },
            },
            {
              $addFields: {
                "consumed_items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$consumed_items.stock.unit_product._id"],
                    },
                    "$consumed_items.stock",
                    "$consumed_items.stock.unit_product",
                  ],
                },
                "consumed_items.quantity": {
                  $multiply: [
                    "$consumed_items.quantity",
                    {
                      $ifNull: ["$consumed_items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "consumed_items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "consumed_items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$consumed_items.stock._id",
                stock: {
                  $first: "$consumed_items.stock",
                },
                quantity: {
                  $sum: "$consumed_items.quantity",
                },
                case_quantity: {
                  $sum: "$consumed_items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },

        produced_production: (cb) => {
          Production.aggregate([
            {
              $match: {
                ...(!isEmpty(date) && {
                  date: {
                    $gt: date.clone().endOf("day").toDate(),
                  },
                }),
                "warehouse._id": mongoose.Types.ObjectId(warehouse._id),
                deleted: {
                  $exists: false,
                },
                produced_items: {
                  $elemMatch: {
                    $exists: true,
                  },
                },
              },
            },
            {
              $unwind: {
                path: "$produced_items",
              },
            },
            {
              $addFields: {
                "produced_items.stock": {
                  $cond: [
                    {
                      //evaluates true if there is no unit product
                      $not: ["$produced_items.stock.unit_product._id"],
                    },
                    "$produced_items.stock",
                    "$produced_items.stock.unit_product",
                  ],
                },
                "produced_items.quantity": {
                  $multiply: [
                    "$produced_items.quantity",
                    {
                      $ifNull: ["$produced_items.stock.pieces_in_case", 1],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                "produced_items.stock": {
                  $exists: true,
                },
                ...(stock && {
                  "produced_items.stock._id": ObjectId(stock._id),
                }),
              },
            },
            {
              $group: {
                _id: "$produced_items.stock._id",
                stock: {
                  $first: "$produced_items.stock",
                },
                quantity: {
                  $sum: "$produced_items.quantity",
                },
                case_quantity: {
                  $sum: "$produced_items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          console.log(err);
          reject(err);
        }

        let transactions = [];

        forOwn(results, (value, key) => {
          transactions = [...transactions, ...value];
        });

        let stocks = uniqBy(transactions, (o) => o.stock._id.toString());

        /* const non_inventory_part_stocks = results.non_inventory_part.map((o) =>
          o._id.toString()
        ); */

        /* stocks = stocks.filter(
          (o) => !non_inventory_part_stocks.includes(o._id.toString())
        ); */

        stocks = orderBy(stocks, ["stock.name"], ["asc"]);
        stocks = stocks.map((o) => o.stock);

        async.map(
          stocks,
          async (stock) => {
            let physical_count = this.getQuantitiesFromResult({
              results,
              transaction: "physical_count",
              stock,
            });

            let receiving_report = this.getQuantitiesFromResult({
              results,
              transaction: "receiving_report",
              stock,
            });

            let purchase_return = this.getQuantitiesFromResult({
              results,
              transaction: "purchase_return",
              stock,
            });

            let sales = {
              case_quantity: 0,
              quantity: 0,
            };

            let sales_returns = {
              case_quantity: 0,
              quantity: 0,
            };

            if (warehouse.name === "Display Area") {
              sales = this.getQuantitiesFromResult({
                results,
                transaction: "sales",
                stock,
              });

              sales_returns = this.getQuantitiesFromResult({
                results,
                transaction: "sales_returns",
                stock,
              });
            }

            let wastage = this.getQuantitiesFromResult({
              results,
              transaction: "wastage",
              stock,
            });

            let inventory_adjustments = this.getQuantitiesFromResult({
              results,
              transaction: "inventory_adjustments",
              stock,
            });

            /* let stock_release = this.getQuantitiesFromResult({
              results,
              transaction: "stock_release",
              stock,
            }); */

            let stock_transfer_in = this.getQuantitiesFromResult({
              results,
              transaction: "stock_transfer_in",
              stock,
            });

            //console.log(stock.name, stock_transfer_in);

            let stock_transfer_out = this.getQuantitiesFromResult({
              results,
              transaction: "stock_transfer_out",
              stock,
            });

            let consumed_production = this.getQuantitiesFromResult({
              results,
              transaction: "consumed_production",
              stock,
            });

            let produced_production = this.getQuantitiesFromResult({
              results,
              transaction: "produced_production",
              stock,
            });

            const transactions = [
              { transaction: physical_count, is_inc: true },
              { transaction: receiving_report, is_inc: true },
              { transaction: purchase_return, is_inc: false },
              { transaction: wastage, is_inc: false },
              { transaction: inventory_adjustments, is_inc: true },
              /* { transaction: stock_release, is_inc: false }, */

              { transaction: stock_transfer_in, is_inc: true },
              { transaction: stock_transfer_out, is_inc: false },
              { transaction: consumed_production, is_inc: false },
              { transaction: produced_production, is_inc: true },
              { transaction: sales, is_inc: false },
              { transaction: sales_returns, is_inc: true },
            ];

            const end_bal = numeral(0);

            transactions.forEach((o) => {
              if (o.is_inc) {
                end_bal.add(o.transaction.quantity || 0);
              } else {
                end_bal.subtract(o.transaction.quantity || 0);
              }
            });

            const cost = await getAverageCostOfStock({
              stock: {
                ...stock,
                _id:
                  typeof stock._id === "object"
                    ? stock._id
                    : ObjectId(stock._id),
              },
            });

            let end_bal_case_quantity = 0;
            let end_bal_quantity = 0;

            end_bal_case_quantity = 0;
            end_bal_quantity = end_bal.value();

            //console.log(typeof stock._id);

            return {
              stock,
              cost,
              physical_count,
              receiving_report,
              purchase_return,
              wastage,
              consumed_production,
              produced_production,
              inventory_adjustments,
              sales,
              sales_returns,
              /* stock_release, */
              stock_transfer_in,
              stock_transfer_out,

              end_bal: {
                case_quantity: end_bal_case_quantity,
                quantity: end_bal_quantity,
              },
              end_bal_case_quantity,
              end_bal_quantity,
              inventory_amount: round(end_bal.value() * cost || 0),
            };
          },
          (err, results) => {
            if (err) {
              return reject(err);
            }

            return resolve({
              date,
              warehouse: warehouse,
              result: results,
            });
          }
        );
      }
    );
  });
};

module.exports.getLatestPhysicalCount = ({ warehouse }) => {
  return new Promise((resolve, reject) => {
    PhysicalCount.findOne({
      deleted: {
        $exists: false,
      },
      "warehouse._id": ObjectId(warehouse._id),
    })
      .sort({ date: -1 })
      .then((record) => resolve(record))
      .catch((err) => reject(err));
  });
};

module.exports.getStockReleasesAndCollectionsFromDeliveries = ({ sale }) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        releases: (cb) => {
          StockReleasing.find({
            deleted: {
              $exists: false,
            },
            $or: [
              {
                "sale._id": sale._id,
              },
              {
                "sale._id": sale._id.toString(),
              },
            ],
          }).exec(cb);
        },

        customer_collections: (cb) => {
          CustomerCollection.find({
            "items.items._id": sale._id.toString(),
          }).exec(cb);
        },

        sales_returns: (cb) => {
          SalesReturn.find({
            "items.sale._id": sale._id.toString(),
          }).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          return reject(err);
        }

        return resolve(results);
      }
    );
  });
};

module.exports.getQuantitiesFromResult = ({ results, transaction, stock }) => {
  const result = (results[transaction] || []).find((o) => {
    const _id1 =
      typeof o.stock._id === "object" ? o.stock._id.toString() : o.stock._id;

    const _id2 =
      typeof stock._id === "object" ? stock._id.toString() : stock._id;

    return _id1 === _id2;
  });

  return {
    case_quantity: result ? Math.abs(result.case_quantity) : 0,
    quantity: result ? result.quantity : 0,
  };
};
