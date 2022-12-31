require("dotenv").config();
const mongoose = require("mongoose");
const moment = require("moment");

const Product = require("./models/Product");
const Category = require("./models/Category");
const Counter = require("./models/Counter");
const xlsx = require("xlsx");
const round = require("./utils/round");
const asyncForeach = require("./utils/asyncForeach");
const Supplier = require("./models/Supplier");
const isEmpty = require("./validators/is-empty");

const db = require("./config/keys").mongoURI;
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => {
    console.log("MongoDB started");
  })
  .catch((err) => console.log(err));

const ObjectId = mongoose.Types.ObjectId;
importData = async () => {
  var workbook = xlsx.readFile("./PRICE-LIST-2-increase.xlsx");

  const ws = workbook.Sheets["OVERALL"];
  const json = xlsx.utils.sheet_to_json(ws, { raw: false });

  console.log("processing...");

  await asyncForeach(json, async (o, index) => {
    const supplier_name = o["SUPPLIER NAME"];

    const supplier = await Supplier.findOneAndUpdate(
      {
        name: supplier_name,
      },
      {
        $set: {
          name: supplier_name,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const product_name = o["PRODUCT NAME"].toUpperCase().trim();

    const sku = o["SKU"]?.toUpperCase().trim();
    let price = o["RETAIL"];
    let wholesale_price = o["WHOLESALE"];
    let oot_price = !isEmpty(o["OOT"]) ? o["OOT"] : wholesale_price;
    let retail_price = !isEmpty(o["RETAIL"]) ? o["RETAIL"] : wholesale_price;

    await Product.findOneAndUpdate(
      {
        name: product_name,
        sku,
        "supplier._id": ObjectId(supplier._id),
      },
      {
        $set: {
          supplier,
          sku,
          name: product_name,
          price: !isEmpty(price) ? price : wholesale_price,
          wholesale_price,
          retail_price,
          oot_price,
          taxable: true,
          type_of_senior_discount: "N/A",
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log(`Adding ${product_name}`);
  });
  console.log("Done");
};

importData();
