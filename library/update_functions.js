const mongoose = require("mongoose");
const moment = require("moment");
const constants = require("../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const round = require("./../utils/round");
const numeral = require("numeral");
const async = require("async");
const isEmpty = require("../validators/is-empty");
const Counter = require("../models/Counter");
const Sales = require("../models/Sales");
const StockReleasing = require("../models/StockReleasing");

const StockReceiving = require("../models/StockReceiving");
const Stock = require("../models/Product");
const TruckTally = require("../models/TruckTally");
const forOwn = require("lodash").forOwn;
const sumBy = require("lodash").sumBy;
const uniqBy = require("lodash").uniqBy;
const orderBy = require("lodash").orderBy;

const axios = require("axios");
const Production = require("../models/Production");
const { getSettingValueFromKey } = require("./setting_functions");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockTransfer = require("../models/StockTransfer");
const InventoryAdjustment = require("../models/InventoryAdjustment");
const Wastage = require("../models/Wastage");
const PurchaseReturn = require("../models/PurchaseReturn");
const PhysicalCount = require("../models/PhysicalCount");
const Product = require("../models/Product");
const Dispatch = require("../models/Dispatch");
const {
  getBranchInventoryBalanceList,
  getBranchInventoryBalance,
} = require("./inventory_functions");
const SalesOrder = require("../models/SalesOrder");
const {
  STATUS_PARTIAL,
  STATUS_FULL,
  DELIVERY_TYPE_COMPANY_DELIVERED,
  STATUS_PAID,
  OPEN,
  CREDIT_MEMO_UNCLAIMED,
  CREDIT_MEMO_CLAIMED,
  CREDIT_MEMO_PARTIALLY_CLAIMED,
  CLOSED,
} = require("../config/constants");
const TankerWithdrawal = require("../models/TankerWithdrawal");
const DeliveryReceipt = require("../models/DeliveryReceipt");
const SupplierWithdrawal = require("../models/SupplierWithdrawal");
const CustomerCollection = require("../models/CustomerCollection");
const CreditMemo = require("../models/CreditMemo");
const DebitMemo = require("../models/DebitMemo");
const CompanyCounter = require("../models/CompanyCounter");
const CheckVoucher = require("../models/CheckVoucher");
const SalesOrderCement = require("../models/SalesOrderCement");
const TransactionAuditTrail = require("../models/TransactionAuditTrail");

const ObjectId = mongoose.Types.ObjectId;

module.exports.updateCategoryOfItems = ({ category }) => {
  const InventoryTransactions = [
    {
      Model: PurchaseOrder,
      items_key: "items",
    },
    {
      Model: StockReceiving,
      items_key: "items",
    },
    {
      Model: StockTransfer,
      items_key: "items",
    },
    {
      Model: InventoryAdjustment,
      items_key: "items",
    },
    {
      Model: Wastage,
      items_key: "items",
    },
    {
      Model: PurchaseReturn,
      items_key: "items",
    },
    {
      Model: PhysicalCount,
      items_key: "items",
    },
    {
      Model: Production,
      items_key: "consumed_items",
    },
    {
      Model: Production,
      items_key: "produced_items",
    },
  ];
  const date = moment().subtract({ year: 1 }).startOf("day").toDate();

  async.each(InventoryTransactions, async (Transaction) => {
    /**
     * update only items , 1 yeear from now
     */

    const { Model, items_key } = Transaction;

    await Model.updateMany(
      {
        date: {
          $gte: date,
        },
        [`${items_key}.stock.category._id`]: category._id.toString(),
      },
      {
        $set: {
          [`${items_key}.$[elem].stock.category`]: {
            ...category,
            _id: category._id.toString(),
          },
        },
      },
      {
        arrayFilters: [
          {
            "elem.stock.category._id": category._id.toString(),
          },
        ],
        multi: true,
      }
    ).exec();

    /** update unit product in transactions stored in stock */

    Model.updateMany(
      {
        date: {
          $gte: date,
        },
        [`${items_key}.stock.unit_product.category._id`]:
          category._id.toString(),
      },
      {
        $set: {
          [`${items_key}.$[elem].stock.unit_product.category`]: {
            ...category,
            _id: category._id.toString(),
          },
        },
      },
      {
        arrayFilters: [
          {
            "elem.stock.unit_product.category._id": category._id.toString(),
          },
        ],
        multi: true,
      }
    ).exec();
  });

  Sales.updateMany(
    {
      datetime: {
        $gte: date,
      },
      "items.product.category._id": category._id.toString(),
    },
    {
      $set: {
        "items.$[elem].product.category": {
          ...category,
          _id: category._id.toString(),
        },
      },
    },
    {
      arrayFilters: [
        {
          "elem.product.category._id": category._id.toString(),
        },
      ],
      multi: true,
    }
  ).exec();

  /** update unit product in transactions stored in stock */

  Sales.updateMany(
    {
      date: {
        $gte: date,
      },
      "items.product.unit_product.category._id": category._id.toString(),
    },
    {
      $set: {
        "items.$[elem].product.unit_product.category": {
          ...category,
          _id: category._id.toString(),
        },
      },
    },
    {
      arrayFilters: [
        {
          "elem.product.unit_product.category._id": category._id.toString(),
        },
      ],
      multi: true,
    }
  ).exec();

  /** update unit product in transactions stored in stock */

  Product.updateMany(
    {
      "category._id": category._id.toString(),
    },
    {
      $set: {
        category: {
          ...category,
          _id: category._id.toString(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();

  Product.updateMany(
    {
      "unit_product.category._id": category._id.toString(),
    },
    {
      $set: {
        "unit_product.category": {
          ...category,
          _id: category._id.toString(),
        },
      },
    },
    {
      multi: true,
    }
  ).exec();
};

module.exports.updateTransactionsOfItem = ({ product }) => {
  const InventoryTransactions = [
    {
      Model: PurchaseOrder,
      items_key: "items",
    },
    {
      Model: StockReceiving,
      items_key: "items",
    },
    {
      Model: StockTransfer,
      items_key: "items",
    },
    {
      Model: InventoryAdjustment,
      items_key: "items",
    },
    {
      Model: Wastage,
      items_key: "items",
    },
    {
      Model: PurchaseReturn,
      items_key: "items",
    },
    {
      Model: PhysicalCount,
      items_key: "items",
    },
    {
      Model: Production,
      items_key: "consumed_items",
    },
    {
      Model: Production,
      items_key: "produced_items",
    },
  ];
  const date = moment().subtract({ year: 1 }).startOf("day").toDate();

  async.each(InventoryTransactions, async (Transaction) => {
    /**
     * update only items , 1 yeear from now
     */

    const { Model, items_key } = Transaction;

    await Model.updateMany(
      {
        date: {
          $gte: date,
        },
        [`${items_key}.stock._id`]: product._id,
      },
      {
        $set: {
          [`${items_key}.$[elem].stock`]: {
            ...product,
          },
        },
      },
      {
        arrayFilters: [
          {
            "elem.stock._id": product._id,
          },
        ],
        multi: true,
      }
    ).exec();

    /** update unit product in transactions stored in stock */

    Model.updateMany(
      {
        date: {
          $gte: date,
        },
        [`${items_key}.stock.unit_product._id`]: product._id,
      },
      {
        $set: {
          [`${items_key}.$[elem].stock.unit_product`]: {
            ...product,
          },
        },
      },
      {
        arrayFilters: [
          {
            "elem.stock.unit_product._id": product._id,
          },
        ],
        multi: true,
      }
    ).exec();
  });

  let items_key = "items";

  Sales.updateMany(
    {
      datetime: {
        $gte: date,
      },
      "items.product._id": product._id.toString(),
    },
    {
      $set: {
        "items.$[elem].product": {
          ...product,
          _id: product._id.toString(),
        },
      },
    },
    {
      arrayFilters: [
        {
          "elem.product._id": product._id.toString(),
        },
      ],
      multi: true,
    }
  ).exec();

  /** update unit product in transactions stored in stock */

  Sales.updateMany(
    {
      date: {
        $gte: date,
      },
      "items.product.unit_product._id": product._id.toString(),
    },
    {
      $set: {
        "items.$[elem].product.unit_product": {
          ...product,
          _id: product._id.toString(),
        },
      },
    },
    {
      arrayFilters: [
        {
          "elem.product.unit_product._id": product._id.toString(),
        },
      ],
      multi: true,
    }
  ).exec();

  /** update unit product in transactions stored in stock */

  Product.updateMany(
    {
      "unit_product._id": product._id,
    },
    {
      $set: {
        unit_product: {
          ...product,
        },
      },
    },
    {
      multi: true,
    }
  ).exec();
};

module.exports.updateCustomerInformationInTransactions = ({ customer }) => {
  const Models = [
    SalesOrder,
    Sales,
    StockReleasing,
    SalesReturn,
    StockReceiving,
    Invoice,
  ];

  async.each(Models, (Model) => {
    Model.updateMany(
      {
        "customer._id": customer._id,
      },
      {
        $set: {
          customer,
        },
      }
    ).exec();
  });
};

module.exports.getAverageCostOfStock = ({ stock }) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        stock: (cb) => {
          Stock.findOne({ _id: stock._id }).exec(cb);
        },
        costing: (cb) => {
          StockReceiving.aggregate([
            {
              $match: {
                supplier: {
                  $exists: true,
                },
                deleted: {
                  $exists: false,
                },
                stock_transfer: {
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
                "items.stock._id": stock._id,
                total_amount: {
                  $gt: 0,
                },
              },
            },

            {
              $group: {
                _id: null,
                total_cost: {
                  $sum: "$items.amount",
                },
                total_quantity: {
                  $sum: "$items.quantity",
                },
                total_case_quantity: {
                  $sum: "$items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },
        production_costing: (cb) => {
          Production.aggregate([
            {
              $match: {
                deleted: {
                  $exists: false,
                },
              },
            },
            {
              $unwind: {
                path: "$produced_items",
              },
            },
            {
              $match: {
                "produced_items.stock._id": stock._id,
                "produced_items.amount": {
                  $gt: 0,
                },
              },
            },
            {
              $group: {
                _id: null,
                total_cost: {
                  $sum: "$produced_items.amount",
                },
                total_quantity: {
                  $sum: "$produced_items.quantity",
                },
                total_case_quantity: {
                  $sum: "$produced_items.case_quantity",
                },
              },
            },
          ]).exec(cb);
        },
      },
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        const stock = results.stock;
        let average_cost = (stock && stock.opening_inventory_cost) || 0;

        let total_quantity = 0;
        let total_cost = 0;

        if (results.costing.length > 0) {
          total_cost += round(results.costing[0].total_cost);

          total_quantity += round(
            results.costing[0].total_quantity +
              round(
                results.costing[0].total_case_quantity *
                  ((stock && stock.pieces_in_case) || 1)
              )
          );
        }

        if (results.production_costing.length > 0) {
          total_cost += round(results.production_costing[0].total_cost);

          total_quantity += round(
            results.production_costing[0].total_quantity +
              round(
                results.production_costing[0].total_case_quantity *
                  ((stock && stock.pieces_in_case) || 1)
              )
          );
        }

        average_cost = round(total_cost / total_quantity);

        resolve(average_cost);
      }
    );
  });
};

module.exports.putToClients = async ({ endpoint, form_data }) => {
  const clients = await getSettingValueFromKey(constants.SETTING_CLIENTS_IP);

  async.each(clients || [], (client) => {
    axios
      .put(`http://${client}:5000${endpoint}`, {
        ...form_data,
      })
      .catch((err) => console.log(err));
  });
};

module.exports.postToClients = async ({ endpoint, form_data }) => {
  const clients = await getSettingValueFromKey(constants.SETTING_CLIENTS_IP);

  async.each(clients || [], (client) => {
    axios
      .post(`http://${client}:5000${endpoint}`, {
        ...form_data,
      })
      .catch((err) => console.log(err));
  });
};

module.exports.deleteToClients = async ({ endpoint }) => {
  const clients = await getSettingValueFromKey(constants.SETTING_CLIENTS_IP);

  async.map(clients || [], (client) => {
    axios
      .delete(`http://${client}:5000${endpoint}`)
      .catch((err) => console.log(err));
  });
};

module.exports.loadTruckTally = (_id, loading_status = "Loaded") => {
  return new Promise((resolve, reject) => {
    TruckTally.findOne({
      _id: ObjectId(_id),
    })
      .lean()
      .then(async (record) => {
        if (isEmpty(record)) return reject({ msg: "No record found" });

        await async.each(record.items, async (item) => {
          const log = await Dispatch.updateOne(
            {
              "items._id": ObjectId(item.dispatch_item_id),
            },
            {
              $set: {
                "items.$.loading_status": loading_status,
              },
            }
          ).exec();

          return null;
        });

        return resolve(true);
      });
  });
};

module.exports.assignDrNumberToTruckTally = (_id) => {
  return new Promise((resolve, reject) => {
    console.log("here");
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.customer._id",
          customer: {
            $first: "$items.customer",
          },
          items: {
            $push: "$items",
          },
        },
      },
    ])
      .then(async (records) => {
        await async.each(records, async (orders) => {
          const { next } = await Counter.increment("dr_no");

          await async.each(orders.items, async (items) => {
            const log = await TruckTally.updateOne(
              {
                "items._id": ObjectId(items._id),
              },
              {
                $set: {
                  "items.$.dr_no": next,
                },
              }
            ).exec();

            return null;
          });

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

//record is coming from ohysical count
module.exports.adjustActualCount = ({ _id }) => {
  return new Promise(async (resolve, reject) => {
    const record = await PhysicalCount.findOne({ _id: ObjectId(_id) }).lean();

    if (isEmpty(record)) {
      return resolve(true);
    }

    const stock_ids = (record.items || []).map((item) => {
      return ObjectId(item.stock._id);
    });

    const application_date = moment(record.application_date)
      .startOf("day")
      .minute(1)
      .toDate();

    const inventory_list = await getBranchInventoryBalanceList({
      date: application_date,
      branch: record.branch,
      stock_ids,
    });

    let items = await async.map([...record.items], async (item) => {
      // console.log(item.stock, record.warehouse);

      const running_balance =
        inventory_list?.filter(
          (o) => o.stock?._id?.toString() === item.stock?._id?.toString()
        )?.[0]?.quantity || 0;

      const actual_count = item.quantity;

      const adjustment_quantity = round(actual_count - running_balance);

      return {
        ...item,
        adjustment_quantity,
        running_balance,
      };
    });

    await PhysicalCount.updateOne(
      {
        _id: ObjectId(record._id),
      },
      {
        $set: {
          items,
        },
      }
    ).exec();

    resolve(true);
  });
};

module.exports.updateSalesOrderFromTankerWithdrawals = ({
  items,
  is_inc = true,
}) => {
  return new Promise(async (resolve, reject) => {
    await async.eachSeries(items, (item, cb) => {
      SalesOrder.updateOne(
        {
          "items._id": ObjectId(item.so_item_id),
        },
        {
          $inc: {
            "items.$.confirmed_quantity": is_inc
              ? item.quantity
              : 0 - item.quantity,
          },
        }
      ).exec(cb);
    });

    return resolve(true);
  });
};

module.exports.updateSalesOrdersStatusOnConfirmedQuantity = ({
  _id, //tanker
}) => {
  return new Promise(async (resolve, reject) => {
    TankerWithdrawal.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.so_id",
        },
      },
    ])
      .then(async (records) => {
        await async.eachSeries(records, async (record) => {
          const sales_order = await SalesOrder.findOne({
            _id: ObjectId(record._id),
          });

          const total_quantity = sumBy(sales_order.items, (o) => o.quantity);
          const total_confirmed_quantity = sumBy(
            sales_order.items,
            (o) => o.confirmed_quantity || 0
          );

          let status = STATUS_PARTIAL;

          if (total_confirmed_quantity >= total_quantity) {
            status = STATUS_FULL;
          }

          await SalesOrder.updateOne(
            {
              _id: ObjectId(record._id),
            },
            {
              $set: {
                "status.approval_status": status,
              },
            }
          ).exec();

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updateSalesOrderStatusBasedOnWithdrawals = (_id) => {
  return new Promise(async (resolve, reject) => {
    const sales_order = await SalesOrder.findOne({
      _id: ObjectId(_id),
    });

    const total_quantity = sumBy(sales_order.items, (o) => o.quantity);
    const total_confirmed_quantity = sumBy(
      sales_order.items,
      (o) => o.confirmed_quantity || 0
    );

    let status = STATUS_PARTIAL;

    if (total_confirmed_quantity >= total_quantity) {
      status = STATUS_FULL;
    }

    await SalesOrder.updateOne(
      {
        _id: ObjectId(_id),
      },
      {
        $set: {
          "status.approval_status": status,
        },
      }
    ).exec();

    return resolve(true);
  });
};

module.exports.createDeliveryReceiptFromSalesOrder = ({ _id }) => {
  return new Promise((resolve, reject) => {
    SalesOrder.findOne({
      _id: ObjectId(_id),
    })
      .lean(true)
      .then(async (record) => {
        if (isEmpty(record)) return reject({ msg: "Record not found" });

        let counter_value;
        if (record.department?._id) {
          const { next } = await CompanyCounter.increment(
            "dr_no",
            record?.department?._id
          );
          counter_value = next;
        } else {
          const { next } = await Counter.increment("dr_no");
          counter_value = next;
        }

        const sales_order_id = record._id;
        delete record._id;

        const date = moment(record.date_needed);
        const due_date = date.add({
          days: record.customer?.terms,
        });

        console.log(counter_value);

        const dr = new DeliveryReceipt({
          dr_no: counter_value,
          sales_order: {
            _id: sales_order_id,
            so_no: record.so_no,
          },
          delivery_area: record.delivery_area,
          ...record,
          status: {
            ...record.status,
            approval_status: OPEN,
          },
          due_date,
        });

        dr.save()
          .then(() => {
            return resolve(true);
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
};

module.exports.createDeliveryReceiptFromSalesOrderCement = ({ _id }) => {
  return new Promise((resolve, reject) => {
    SalesOrderCement.findOne({
      _id: ObjectId(_id),
    })
      .lean(true)
      .then(async (record) => {
        if (isEmpty(record)) return reject({ msg: "Record not found" });

        let counter_value;
        if (record.department?._id) {
          const { next } = await CompanyCounter.increment(
            "dr_no",
            record?.department?._id
          );
          counter_value = next;
        } else {
          const { next } = await Counter.increment("dr_no");
          counter_value = next;
        }

        const sales_order_id = record._id;
        delete record._id;

        const date = moment(record.date_needed);
        const due_date = date.add({
          days: record.customer?.terms,
        });

        const dr = new DeliveryReceipt({
          dr_no: counter_value,
          sales_order: {
            _id: sales_order_id,
            so_no: record.so_no,
          },
          delivery_area: record.delivery_area,
          ...record,
          status: {
            ...record.status,
            approval_status: OPEN,
          },
          due_date,
        });

        dr.save()
          .then(() => {
            return resolve(true);
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
};

module.exports.createDeliveryReceiptFromTankerWithdrawal = ({
  _id,
  is_per_unit_dr,
}) => {
  return new Promise((resolve, reject) => {
    TankerWithdrawal.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: {
            customer: "$items.customer._id",
            sales_order: "$items.so_id",
            ...(is_per_unit_dr && {
              unit: "$items.unit._id",
            }),
          },
          ...(is_per_unit_dr && {
            unit: {
              $first: "$items.unit",
            },
          }),
          company: {
            $first: "$company",
          },
          department: {
            $first: "$department",
          },
          so_delivery_area: {
            $first: "$items.so_delivery_area",
          },
          so_id: {
            $first: "$items.so_id",
          },
          so_no: {
            $first: "$items.so_no",
          },
          customer: {
            $first: "$items.customer",
          },
          external_dr_ref: {
            $first: "$items.external_dr_ref",
          },
          date: {
            $first: "$date",
          },
          tanker_withdrawal_id: {
            $first: "$_id",
          },
          tw_no: {
            $first: "$tw_no",
          },
          status: {
            $first: "$status",
          },

          items: {
            $push: {
              stock: "$items.stock",
              quantity: "$items.quantity",
              unit_of_measure: "$items.unit_of_measure",
              price: "$items.price",
              amount: "$items.amount",
            },
          },
        },
      },
    ])
      .allowDiskUse(true)
      .then(async (records) => {
        await async.eachSeries(records, async (record) => {
          let counter_value;
          if (record.department?._id) {
            const { next } = await CompanyCounter.increment(
              "dr_no",
              record?.department?._id
            );
            counter_value = next;
          } else {
            const { next } = await Counter.increment("dr_no");
            counter_value = next;
          }

          const date = moment(record.date);
          const due_date = date.add({
            days: record.customer?.terms,
          });

          const dr = new DeliveryReceipt({
            dr_no: counter_value,
            customer: record.customer,
            external_dr_ref: record.external_dr_ref,
            delivery_area: record.so_delivery_area,
            sales_order: {
              _id: record.so_id,
              so_no: record.so_no,
            },
            unit: record.unit,
            items: record.items,
            tanker_withdrawal: {
              _id: record.tanker_withdrawal_id,
              tw_no: record.tw_no,
            },
            delivery_type: DELIVERY_TYPE_COMPANY_DELIVERED,
            date: record.date,
            due_date: due_date.toDate(),
            company: record.company,
            department: record.department,
            status: {
              ...record.status,
              approval_status: OPEN,
            },
          });

          await dr.save();

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.createDeliveryReceiptFromTruckTally = ({ _id }) => {
  return new Promise((resolve, reject) => {
    TruckTally.aggregate([
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            tw_no: "$tw_no",
            customer_id: "$items.customer._id",
            warehouse_id: "$warehouse.warehouse_id",
          },
          customer: {
            $first: "$items.customer",
          },
          items: {
            $push: {
              stock: "$items.stock",
              quantity: "$items.quantity",
              unit_of_measure: "$items.unit_of_measure",
              price: "$items.price",
              amount: "$items.amount",
            },
          },
        },
      },
    ])
      .then(async (records) => {
        if (isEmpty(records)) reject(err);

        await async.eachSeries(records, async (record) => {
          const dr = new DeliveryReceipt({
            tanker_withdrawal: {
              _id: record._id._id,
              tw_no: record._id.tw_no,
            },
            customer: record.customer,
            items: record.items,
          });

          await dr.save();

          return null;
        });

        resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updateSupplierWithdrawalsFromTankerWithdrawals = ({
  items,
  is_inc = true,
}) => {
  return new Promise(async (resolve, reject) => {
    await async.eachSeries(items, (item, cb) => {
      SupplierWithdrawal.updateOne(
        {
          "items._id": ObjectId(item.supplier_withdrawal_item_id),
        },
        {
          $inc: {
            "items.$.withdrawn": is_inc ? item.quantity : 0 - item.quantity,
          },
        }
      ).exec(cb);
    });

    return resolve(true);
  });
};

module.exports.updateDeliveriesFromCollection = ({
  delivery_items,
  is_inc = true,
}) => {
  return new Promise((resolve, reject) => {
    const items = [...delivery_items];

    async.eachSeries(
      items,
      (item, cb) => {
        if (item.payment_amount > 0) {
          let query = {
            _id: ObjectId(item._id),
          };

          let update = {
            $inc: {
              total_payment_amount: is_inc
                ? round(item.payment_amount)
                : 0 - round(item.payment_amount),
            },
          };

          DeliveryReceipt.updateOne(query, update).exec(cb);
        } else {
          cb(null);
        }
      },
      (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(true);
      }
    );
  });
};

module.exports.updateDeliveryStatusFromPayment = ({ _id }) => {
  return new Promise((resolve, reject) => {
    CustomerCollection.findOne({
      _id: ObjectId(_id),
    })
      .then(async (record) => {
        if (isEmpty(record)) reject({ msg: "No record found" });

        await async.eachSeries(record.delivery_items, async (_dr) => {
          const dr = await DeliveryReceipt.findOne({ _id: ObjectId(_dr._id) });

          //get total amount
          const total_amount = round(sumBy(dr.items, (o) => o.amount));

          const total_payment_amount = round(dr.total_payment_amount || 0);

          const balance = total_amount - total_payment_amount;

          let approval_status = STATUS_PARTIAL;

          if (balance <= 0) {
            approval_status = STATUS_PAID;
          } else if (balance == total_amount) {
            approval_status = OPEN;
          }

          DeliveryReceipt.updateOne(
            {
              _id: ObjectId(dr._id),
            },
            {
              $set: {
                "status.approval_status": approval_status,
              },
            }
          ).exec();

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updateCreditMemoStatusFromPayment = ({ _id }) => {
  return new Promise((resolve, reject) => {
    CustomerCollection.findOne({
      _id: ObjectId(_id),
    })
      .then(async (record) => {
        if (isEmpty(record)) reject({ msg: "No record found" });

        await async.eachSeries(
          record.credit_memo_items,
          async (_credit_memo) => {
            const credit_memo = await CreditMemo.findOne({
              _id: ObjectId(_credit_memo._id),
            });

            //get total amount
            const total_amount = round(
              sumBy(credit_memo.items, (o) => o.amount)
            );

            const total_credit_amount = round(
              credit_memo.total_credit_amount || 0
            );

            const balance = total_amount - total_credit_amount;

            let approval_status = CREDIT_MEMO_PARTIALLY_CLAIMED;

            if (balance <= 0) {
              approval_status = CREDIT_MEMO_CLAIMED;
            } else if (balance == total_amount) {
              approval_status = CREDIT_MEMO_UNCLAIMED;
            }

            await CreditMemo.updateOne(
              {
                _id: ObjectId(credit_memo._id),
              },
              {
                $set: {
                  "status.approval_status": approval_status,
                },
              }
            ).exec();

            return null;
          }
        );

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updateCreditMemosFromCollection = ({
  credit_memo_items,
  is_inc = true,
}) => {
  return new Promise((resolve, reject) => {
    const items = [...credit_memo_items];

    async.eachSeries(
      items,
      (item, cb) => {
        if (item.credit_amount > 0) {
          let query = {
            _id: ObjectId(item._id),
          };

          let update = {
            $inc: {
              total_credit_amount: is_inc
                ? round(item.credit_amount)
                : 0 - round(item.credit_amount),
            },
          };

          CreditMemo.updateOne(query, update).exec(cb);
        } else {
          cb(null);
        }
      },
      (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(true);
      }
    );
  });
};

module.exports.updatePurchaseOrderStatusFromCheckVoucher = ({ _id }) => {
  return new Promise((resolve, reject) => {
    CheckVoucher.findOne({
      _id: ObjectId(_id),
    })
      .then(async (record) => {
        if (isEmpty(record)) reject({ msg: "No record found" });

        await async.eachSeries(record.purchase_order_items, async (_dr) => {
          const dr = await PurchaseOrder.findOne({ _id: ObjectId(_dr._id) });

          //get total amount
          const total_amount = round(sumBy(dr.items, (o) => o.amount));

          const total_payment_amount = round(dr.total_payment_amount || 0);

          const balance = total_amount - total_payment_amount;

          let approval_status = STATUS_PARTIAL;

          if (balance <= 0) {
            approval_status = STATUS_PAID;
          } else if (balance == total_amount) {
            approval_status = CLOSED;
          }

          PurchaseOrder.updateOne(
            {
              _id: ObjectId(dr._id),
            },
            {
              $set: {
                "status.approval_status": approval_status,
              },
            }
          ).exec();

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updatePurchaseOrderFromCheckVoucher = ({
  purchase_order_items,
  is_inc = true,
}) => {
  return new Promise((resolve, reject) => {
    const items = [...purchase_order_items];

    async.eachSeries(
      items,
      (item, cb) => {
        if (item.payment_amount > 0) {
          let query = {
            _id: ObjectId(item._id),
          };

          let update = {
            $inc: {
              total_payment_amount: is_inc
                ? round(item.payment_amount)
                : 0 - round(item.payment_amount),
            },
          };

          PurchaseOrder.updateOne(query, update).exec(cb);
        } else {
          cb(null);
        }
      },
      (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(true);
      }
    );
  });
};

module.exports.updateDebitMemosFromCheckVoucher = ({
  debit_memo_items,
  is_inc = true,
}) => {
  return new Promise((resolve, reject) => {
    const items = [...debit_memo_items];

    async.eachSeries(
      items,
      (item, cb) => {
        if (item.debit_amount > 0) {
          let query = {
            _id: ObjectId(item._id),
          };

          let update = {
            $inc: {
              total_debit_amount: is_inc
                ? round(item.debit_amount)
                : 0 - round(item.debit_amount),
            },
          };

          DebitMemo.updateOne(query, update).exec(cb);
        } else {
          cb(null);
        }
      },
      (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(true);
      }
    );
  });
};

module.exports.updateDebitMemoStatusFromCheckVoucher = ({ _id }) => {
  return new Promise((resolve, reject) => {
    CheckVoucher.findOne({
      _id: ObjectId(_id),
    })
      .then(async (record) => {
        if (isEmpty(record)) reject({ msg: "No record found" });

        await async.eachSeries(record.debit_memo_items, async (_debit_memo) => {
          const debit_memo = await DebitMemo.findOne({
            _id: ObjectId(_debit_memo._id),
          });

          //get total amount
          const total_amount = round(sumBy(debit_memo.items, (o) => o.amount));

          const total_debit_amount = round(debit_memo.total_debit_amount || 0);

          const balance = total_amount - total_debit_amount;

          let approval_status = CREDIT_MEMO_PARTIALLY_CLAIMED;

          if (balance <= 0) {
            approval_status = CREDIT_MEMO_CLAIMED;
          } else if (balance == total_amount) {
            approval_status = CREDIT_MEMO_UNCLAIMED;
          }

          await CreditMemo.updateOne(
            {
              _id: ObjectId(debit_memo._id),
            },
            {
              $set: {
                "status.approval_status": approval_status,
              },
            }
          ).exec();

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject(err));
  });
};

module.exports.updateSuppliersWithdrawalPriceFromPurchaseOrder = (_id) => {
  return new Promise((resolve, reject) => {
    PurchaseOrder.findOne({
      _id: ObjectId(_id),
    })
      .lean(true)
      .then(async (record) => {
        if (isEmpty(record)) {
          return reject({ msg: "No record found" });
        }

        await async.eachSeries(record.items, async (item) => {
          //update prices and freight charges
          await SupplierWithdrawal.updateMany(
            {
              "purchase_order._id": ObjectId(record._id),
            },
            {
              $set: {
                "items.$[elem].price": item.price || 0,
                "items.$[elem].freight_per_unit": item.freight_per_unit || 0,
              },
            },
            {
              arrayFilters: [
                {
                  "elem.stock._id": ObjectId(item.stock._id),
                },
              ],
            }
          );

          const supplier_withdrawals = await SupplierWithdrawal.find({
            "purchase_order._id": ObjectId(record._id),
          }).lean(true);

          await async.eachSeries(
            supplier_withdrawals,
            async (supplier_withdrawal) => {
              const _items = supplier_withdrawal.items.map((o) => {
                const freight = round(o.quantity * (o.freight_per_unit || 0));
                const amount = round(o.quantity * o.price + freight);

                return {
                  ...o,
                  freight,
                  amount,
                };
              });

              const total_amount = round(sumBy(_items, (o) => o.amount));

              await SupplierWithdrawal.updateOne(
                {
                  _id: ObjectId(supplier_withdrawal._id),
                },
                {
                  $set: {
                    total_amount,
                    gross_amount: total_amount,
                    items: _items,
                  },
                }
              ).exec();
            }
          );

          return null;
        });

        return resolve(true);
      })
      .catch((err) => reject({ err }));
  });
};

//_id is of PO
module.exports.updateSupplierWithdrawalsFromPurchaseOrder = ({ _id }) => {
  return new Promise(async (resolve, reject) => {
    PurchaseOrder.findOne({
      _id: ObjectId(_id),
    }).then(async (record) => {
      if (isEmpty(record)) {
        return reject({ msg: "No record found" });
      }

      await async.eachSeries(record.items, async (item) => {
        //update price of supplier withdrawals
        await SupplierWithdrawal.updateMany(
          {
            "purchase_order._id": ObjectId(_id),
            "items.stock._id": ObjectId(item.stock._id),
          },
          {
            $set: {
              "items.$[elem].price": item.price,
            },
          },
          {
            arrayFilters: [
              {
                "elem.stock._id": ObjectId(item.stock._id),
              },
            ],
          }
        ).exec();

        const records = await SupplierWithdrawal.find({
          "purchase_order._id": ObjectId(_id),
        }).lean();

        //update amount of suppliers withdrawal
        if (records.length > 0) {
          await async.eachSeries(records, async (supplier_withdrawal) => {
            const items = supplier_withdrawal.items.map((item) => {
              const amount = round(
                parseFloat(item.quantity * item.price) + item.freight
              );

              return {
                ...o,
                amount,
              };
            });

            await SupplierWithdrawal.updateOne(
              {
                _id: ObjectId(supplier_withdrawal._id),
              },
              {
                $set: {
                  items,
                },
              }
            ).exec();

            return null;
          });
        }

        return null;
      });

      return resolve(true);
    });
  });
};

module.exports.saveTransactionAuditTrail = ({
  user,
  module_name,
  reference,
  action = constants.ACTION_SAVE,
}) => {
  return new Promise((resolve, reject) => {
    const date = moment();

    new TransactionAuditTrail({
      date,
      user,
      module_name,
      reference,
      action,
    })
      .save()
      .then(() => {
        resolve(true);
      });
  });
};
