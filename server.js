require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const http = require("http").createServer(app);
const passport = require("passport");
const path = require("path");
const io = require("socket.io")(http);

//passport middleare
app.use(passport.initialize());

//passport config
require("./config/passport")(passport);

const db = require("./config/keys").mongoURI;

//routes
const users = require("./routes/api/users");

const categories = require("./routes/api/categories");
const products = require("./routes/api/products");

const sales = require("./routes/api/sales");
const credit_cards = require("./routes/api/credit_cards");
const account_settings = require("./routes/api/account_settings");
const audit_trails = require("./routes/api/audit_trails");

app.use(bodyParser.json({ limit: "100mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "100mb",
    parameterLimit: 100000,
  })
);

mongoose
  .connect(db, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use(
  "/public/images",
  express.static(path.join(__dirname, "static", "images"))
);

app.use("/api/users", users);
app.use("/api/categories", categories);
app.use("/api/products", products);
app.use("/api/unit-of-measures", require("./routes/api/unit-of-measures"));
app.use("/api/areas", require("./routes/api/areas"));
app.use("/api/vessels", require("./routes/api/vessels"));
app.use("/api/companies", require("./routes/api/companies"));
app.use("/api/payment-methods", require("./routes/api/payment-methods"));
app.use("/api/departments", require("./routes/api/departments"));
app.use("/api/tankers", require("./routes/api/tankers"));
app.use("/api/sales-orders", require("./routes/api/sales-orders"));
app.use(
  "/api/sales-orders-cement",
  require("./routes/api/sales-orders-cement")
);
app.use("/api/credit-memos", require("./routes/api/credit-memos"));
app.use("/api/debit-memos", require("./routes/api/debit-memos"));
app.use("/api/check-vouchers", require("./routes/api/check-vouchers"));
app.use("/api/tanker-withdrawals", require("./routes/api/tanker-withdrawals"));
app.use("/api/warehouse-returns", require("./routes/api/warehouse-returns"));
app.use(
  "/api/customer-collections",
  require("./routes/api/customer-collections")
);
app.use("/api/company-use", require("./routes/api/company-use"));
app.use("/api/units", require("./routes/api/units"));
app.use("/api/banks", require("./routes/api/banks"));

app.use("/api/sales", sales);
app.use("/api/credit-cards", credit_cards);
app.use("/api/account-settings", account_settings);
app.use("/api/audit-trails", audit_trails);

app.use("/api/settings", require("./routes/api/settings"));

/**
 * Inventory
 */
app.use("/api/dashboard", require("./routes/api/dashboard"));
app.use("/api/suppliers", require("./routes/api/suppliers"));
app.use("/api/employees", require("./routes/api/employees"));
app.use("/api/nature-of-works", require("./routes/api/nature-of-works"));
app.use("/api/sellers", require("./routes/api/sellers"));
app.use("/api/locations", require("./routes/api/locations"));
app.use("/api/agents", require("./routes/api/agents"));
app.use("/api/customers", require("./routes/api/customers"));
app.use("/api/warehouses", require("./routes/api/warehouses"));

app.use("/api/branches", require("./routes/api/branches"));
app.use("/api/claim-types", require("./routes/api/claim-types"));

app.use("/api/delivery-receipts", require("./routes/api/delivery-receipts"));
app.use("/api/purchase-orders", require("./routes/api/purchase_orders"));
app.use(
  "/api/purchase-orders-cement",
  require("./routes/api/purchase-orders-cement")
);
app.use(
  "/api/supplier-withdrawals",
  require("./routes/api/supplier-withdrawals")
);
app.use("/api/vessel-arrivals", require("./routes/api/vessel-arrivals"));

app.use("/api/stocks-receiving", require("./routes/api/stocks_receiving"));
app.use("/api/stock-transfers", require("./routes/api/stock-transfers"));
app.use(
  "/api/display-delivery-receipts",
  require("./routes/api/display-delivery-receipts")
);
app.use("/api/sales-returns", require("./routes/api/sales-returns"));

app.use("/api/daily-time-records", require("./routes/api/daily-time-records"));
app.use(
  "/api/warehouse-transfers",
  require("./routes/api/warehouse-transfers")
);
app.use("/api/dispatches", require("./routes/api/dispatches"));
app.use("/api/truck-tallies", require("./routes/api/truck-tallies"));
app.use("/api/delivery-returns", require("./routes/api/delivery-returns"));

app.use(
  "/api/inventory-adjustments",
  require("./routes/api/inventory_adjustments")
);
app.use("/api/purchase-returns", require("./routes/api/purchase_returns"));
app.use("/api/physical-counts", require("./routes/api/physical_counts"));
app.use("/api/wastages", require("./routes/api/wastages"));
app.use("/api/production", require("./routes/api/production"));
app.use(
  "/api/account-adjustments",
  require("./routes/api/account-adjustments")
);

app.use("/api/pensions", require("./routes/api/pensions"));
app.use("/api/accounts", require("./routes/api/accounts"));
app.use("/api/account-groups", require("./routes/api/account-groups"));
app.use("/api/staffs", require("./routes/api/staffs"));
app.use("/api/account-statuses", require("./routes/api/account-statuses"));
app.use("/api/collection-types", require("./routes/api/collection-types"));
app.use("/api/transaction-types", require("./routes/api/transaction-types"));

/**
 * payroll
 */

app.use("/api/payroll", require("./routes/api/payroll"));
app.use(
  "/api/scheduled-deductions",
  require("./routes/api/scheduled-deductions")
);
app.use("/api/deductions", require("./routes/api/deductions"));

/**
 * system
 */
app.use("/api/menu-routes", require("./routes/api/menu-routes"));
app.use("/api/role-permissions", require("./routes/api/role-permissions"));
app.use("/api/roles", require("./routes/api/roles"));

app.use("/static", express.static(path.join(__dirname, "public")));

process.setMaxListeners(0);

if (process.env.NODE_ENV === "production") {
  app.use(express.static("build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "build", "index.html"));
  });
}

const port = process.env.SERVER_PORT || 5001;

io.on("connection", (socket) => {
  socket.on("refresh_table", () => {
    socket.broadcast.emit("refresh_table", true);
  });
  socket.on("request-authentication", (data) => {
    socket.broadcast.emit("request-authentication", data);
  });
  socket.on("authenticate", (data) => {
    socket.broadcast.emit("authenticate", data);
  });
});

http.listen(port, () => console.log(`Server running on PORT ${port}`));
