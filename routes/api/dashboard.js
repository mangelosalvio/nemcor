const express = require("express");
const router = express.Router();
const dashboard = require("./../../library/dashboard");
const mongoose = require("mongoose");
const async = require("async");

const ObjectId = mongoose.Types.ObjectId;
router.post("/index", (req, res) => {
  async.parallel(
    {
      pending_purchase_orders: (cb) => {
        dashboard.getPendingPurchaseOrders(cb);
      },
      warehouse_sales: (cb) => {
        dashboard.getWarehouseSales(cb);
      },
      monthly_sales_of_current_year: (cb) => {
        dashboard.getMonthlySalesOfCurrentYear(cb);
      },
      warehouses: (cb) => {
        dashboard.getWarehouses(cb);
      },
    },
    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(401).json(err);
      }

      return res.json(results);
    }
  );
});

router.post("/unpaid-invoices", (req, res) => {
  dashboard
    .getUnpaidInvoices({ customer: req.body.customer })
    .then((records) => {
      return res.json(records);
    })
    .catch((err) => res.status(401).json(err));
});

module.exports = router;
