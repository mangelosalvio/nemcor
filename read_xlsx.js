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
  var workbook = xlsx.readFile("./new-energy-products.xlsx");

  const ws = workbook.Sheets["Sheet1"];
  const json = xlsx.utils.sheet_to_json(ws, { raw: false });

  console.log("processing...");

  await asyncForeach(json, async (o, index) => {
    const product_name = o["NAME"].trim();
    const category_name = o["CATEGORY"].trim();

    const category = await Category.findOneAndUpdate(
      {
        name: category_name,
      },
      {
        $set: {
          name: category_name,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    await Product.findOneAndUpdate(
      {
        name: product_name,
      },
      {
        $set: {
          name: product_name,
          category,
          product_type: "Inventory",
          unit_of_measure: "PC",
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
