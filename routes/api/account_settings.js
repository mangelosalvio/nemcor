const express = require("express");
const router = express.Router();
const VirtualTable = require("./../../models/VirtualTable");
const AccountSetting = require("./../../models/AccountSetting");
const AuditTrail = require("./../../models/AuditTrail");
const Counter = require("./../../models/Counter");
const CounterOtherSet = require("./../../models/CounterOtherSet");
const DeletedOrder = require("./../../models/DeletedOrder");
const Inventory = require("./../../models/Inventory");
const Sales = require("./../../models/Sales");
const SalesOtherSet = require("./../../models/SalesOtherSet");
const Xread = require("./../../models/Xread");
const Zread = require("./../../models/Zread");
const CashCount = require("../../models/CashCount");
const XreadOtherSet = require("../../models/XreadOtherSet");
const AccountCollection = require("../../models/AccountCollection");
const AccountCollectionOtherSet = require("../../models/AccountCollectionOtherSet");
const PurchaseOrder = require("../../models/PurchaseOrder");
const StockReceiving = require("../../models/StockReceiving");
const StockTransfer = require("../../models/StockTransfer");
const InventoryAdjustment = require("../../models/InventoryAdjustment");
const Production = require("../../models/Production");
const Wastage = require("../../models/Wastage");
const PurchaseReturn = require("../../models/PurchaseReturn");
const PhysicalCount = require("../../models/PhysicalCount");

const AccountAdjustment = require("../../models/AccountAdjustment");
const Dispatch = require("../../models/Dispatch");
const DeliveryReturn = require("../../models/DeliveryReturn");
const WarehouseTransfer = require("../../models/WarehouseTransfer");
const TruckTally = require("../../models/TruckTally");
const SuspendSale = require("../../models/SuspendSale");
const exec = require("child_process").exec;

router.put("/shutdown", (req, res) => {
  exec(`echo ${process.env.OS_PASSWORD} | sudo -S poweroff`, (err) => {
    console.log(err);
  });
});

router.get("/:key", (req, res) => {
  AccountSetting.findOne({
    key: req.params.key,
  }).then((setting) => {
    return res.json(setting);
  });
});

router.get("/", (req, res) => {
  AccountSetting.find().then((settings) => res.json(settings));
});

router.post("/", (req, res) => {
  const key = req.body.key;
  const value = req.body.value;

  AccountSetting.findOneAndUpdate(
    {
      key,
    },
    {
      key,
      value,
    },
    {
      upsert: true,
      new: true,
    }
  ).then((setting) => res.json(setting));
});

router.post("/truncate-transactions", (req, res) => {
  AuditTrail.deleteMany({}).exec();
  Counter.deleteMany({}).exec();
  CounterOtherSet.deleteMany({}).exec();
  DeletedOrder.deleteMany({}).exec();
  Inventory.deleteMany({}).exec();
  Sales.deleteMany({}).exec();
  SalesReturns.deleteMany({}).exec();
  SalesOtherSet.deleteMany({}).exec();
  Xread.deleteMany({}).exec();
  XreadOtherSet.deleteMany({}).exec();
  Zread.deleteMany({}).exec();
  XreadOtherSet.deleteMany({}).exec();
  CashCount.deleteMany({}).exec();
  AccountCollection.deleteMany({}).exec();
  AccountCollectionOtherSet.deleteMany({}).exec();
  PurchaseOrder.deleteMany({}).exec();
  StockReceiving.deleteMany({}).exec();
  StockTransfer.deleteMany({}).exec();
  InventoryAdjustment.deleteMany({}).exec();
  Production.deleteMany({}).exec();
  Wastage.deleteMany({}).exec();
  PurchaseReturn.deleteMany({}).exec();
  PhysicalCount.deleteMany({}).exec();
  AccountAdjustment.deleteMany({}).exec();
  VirtualTable.deleteMany({}).exec();
  Dispatch.deleteMany({}).exec();
  DeliveryReturn.deleteMany({}).exec();
  WarehouseTransfer.deleteMany({}).exec();
  TruckTally.deleteMany({}).exec();
  SuspendSale.deleteMany({}).exec();

  return res.json({ success: 1 });
});

module.exports = router;
