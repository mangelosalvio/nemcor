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
const Agent = require("./models/Agent");
const Location = require("./models/Location");
const Customer = require("./models/Customer");

const db = require("./config/keys").mongoURI;
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => {
    console.log("MongoDB started");
  })
  .catch((err) => console.log(err));

importData = async () => {
  var workbook = xlsx.readFile("./CUSTOMERCONTACT.xlsx");

  const ws = workbook.Sheets["ALL"];
  const json = xlsx.utils.sheet_to_json(ws, { raw: false });

  console.log("processing...");

  await asyncForeach(json, async (o, index) => {
    const agent_name = o["AGENT"];

    const agent = await Agent.findOneAndUpdate(
      {
        name: agent_name,
      },
      {
        $set: {
          name: agent_name,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const location_name = o["LOCATION"];
    const location = await Location.findOneAndUpdate(
      {
        name: location_name,
      },
      {
        $set: {
          name: location_name,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const customer_name = o["CUSTOMER"].toUpperCase().trim();
    const contact_no = o["CP_NO"].toUpperCase().trim();

    await Customer.findOneAndUpdate(
      {
        name: customer_name,
      },
      {
        $set: {
          contact_no,
          name: customer_name,
          agent,
          location,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log(`Adding ${customer_name}`);
  });
  console.log("Done");
};

importData();
