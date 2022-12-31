require("dotenv").config();
const mongoose = require("mongoose");
const db = require("./../config/keys").mongoURI;
const sqldatabase = require("./sqldatabase");
const async = require("async");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { SENIOR_DISC_RATIO } = require("../config/constants");
const AccountGroup = require("../models/AccountGroup");
const AccountStatus = require("../models/AccountStatus");
const Area = require("../models/Area");
const Bank = require("../models/Bank");
const Branch = require("../models/Branch");
const ClaimTypes = require("../models/ClaimTypes");

const CollectionType = require("../models/CollectionType");
const InterestRate = require("../models/InterestRate");

const Staff = require("../models/Staff");
const TransactionType = require("../models/TransactionType");
const Account = require("../models/Account");
const { toDate, getFirstRow } = require("../library/migrate_functions");
const Pension = require("../models/Pension");

mongoose
  .connect(db, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

sqldatabase
  .authenticate()
  .then(() => console.log("SQL DB Connected"))
  .catch((err) => console.log("Error : " + err));

sqldatabase
  .query("select * from account_group", {
    type: sqldatabase.QueryTypes.SELECT,
  })
  .then((records) => {
    async.each(records, async (record) => {
      await AccountGroup.updateOne(
        {
          account_group_id: record.account_group_id,
        },
        {
          $set: {
            ...record,
            account_group_type: record.type,
            name: record.account_group,
          },
        },
        {
          upsert: true,
        }
      );
    });
  });

// sqldatabase
//   .query("select * from account_status", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await AccountStatus.updateOne(
//         {
//           name: record.accountstatus,
//         },
//         {
//           $set: {
//             name: record.accountstatus,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from area", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await Area.updateOne(
//         {
//           name: record.area,
//         },
//         {
//           $set: {
//             ...record,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from bank", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await Bank.updateOne(
//         {
//           name: record.bank,
//         },
//         {
//           $set: {
//             ...record,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from branch", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await Branch.updateOne(
//         {
//           name: record.branch,
//         },
//         {
//           $set: {
//             ...record,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from claim_type", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await ClaimTypes.updateOne(
//         {
//           name: record.claim_type,
//         },
//         {
//           $set: {
//             ...record,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from collection_type", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await CollectionType.updateOne(
//         {
//           name: record.collection_type,
//         },
//         {
//           $set: {
//             ...record,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from interest_table", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(
//       records,
//       async (record) => {
//         await InterestRate.updateOne(
//           {
//             table_interest_id: record.table_interest_id,
//           },
//           {
//             $set: {
//               ...record,
//             },
//           },
//           {
//             upsert: true,
//           }
//         );
//       },
//       (err) => {
//         if (err) console.log(err);
//         console.log("Done migrating interest table...");
//       }
//     );
//   });

// sqldatabase
//   .query("select * from staff", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       const branch = await Branch.findOne({
//         branch_id: record.branch_id,
//       });

//       await Staff.updateOne(
//         {
//           staff_id: record.staff_id,
//         },
//         {
//           $set: {
//             ...record,
//             branch,
//             name: record.staffname,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// sqldatabase
//   .query("select * from transtype", {
//     type: sqldatabase.QueryTypes.SELECT,
//   })
//   .then((records) => {
//     async.each(records, async (record) => {
//       await TransactionType.updateOne(
//         {
//           type: record.type,
//         },
//         {
//           $set: {
//             ...record,
//             name: record.transtype,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });
//   });

// (async () => {
//   const increment = 500;
//   let offset = 0;

//   while (true) {
//     const records = await sqldatabase.query(
//       `select * from pension limit ${offset},${increment}`,
//       {
//         type: sqldatabase.QueryTypes.SELECT,
//       }
//     );

//     if (records <= 0) {
//       break;
//     }

//     console.log(`Importing pension ${offset}`);

//     await async.eachLimit(records, 100, async (record) => {
//       const branch = await Branch.findOne({
//         branch_id: record.branch_id,
//       }).lean(true);
//       const account = await Account.findOne({
//         account_id: record.account_id,
//       }).lean(true);
//       const claim_type = await ClaimTypes.findOne({
//         claim_type_id: record.claim_type_id,
//       }).lean(true);
//       const loan_type = await TransactionType.findOne({
//         type: record.loan_type,
//       }).lean(true);

//       await Pension.updateOne(
//         {
//           pension_id: record.pension_id,
//         },
//         {
//           $set: {
//             ...record,
//             branch,
//             account,
//             claim_type,
//             date_request: toDate(record.date_request),
//             date_release: toDate(record.date_release),
//             date_start: toDate(record.date_start),
//             date_sadd: toDate(record.date_sadd),
//             date_end1: toDate(record.date_end1),
//             date_start2: toDate(record.date_start2),
//             date_end2: toDate(record.date_end2),
//             date_eadd: toDate(record.date_eadd),
//             date_approve: toDate(record.date_approve),
//             slupdate: toDate(record.slupdate),
//             loan_type,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });

//     offset += increment;
//   }
//   console.log("Done importing accounts.");
// })();

// (async () => {
//   const increment = 500;
//   let offset = 0;

//   while (true) {
//     const records = await sqldatabase.query(
//       `select * from account limit ${offset},${increment}`,
//       {
//         type: sqldatabase.QueryTypes.SELECT,
//       }
//     );

//     if (records <= 0) {
//       break;
//     }

//     console.log(`Importing accounts ${offset}`);

//     await async.eachLimit(records, 100, async (record) => {
//       const account_group = await AccountGroup.findOne({
//         account_group_id: record.account_group_id,
//       }).lean(true);
//       const branch = await Branch.findOne({
//         branch_id: record.branch_id,
//       }).lean(true);
//       const area = await Area.findOne({
//         area_id: record.area_id,
//       }).lean(true);
//       const collection_type = await CollectionType.findOne({
//         collection_type_id: record.collection_type_id,
//       }).lean(true);
//       const claim_type = await ClaimTypes.findOne({
//         claim_type_id: record.claim_type_id,
//       }).lean(true);
//       const bank = await Bank.findOne({
//         bank_id: record.bank_id,
//       }).lean(true);
//       const bank2 = await Bank.findOne({
//         bank_id: record.bank_id2,
//       }).lean(true);

//       const branch_manager = await Staff.findOne({
//         staff_id: record.bm_id,
//       }).lean(true);
//       const sales_consultant = await Staff.findOne({
//         staff_id: record.sc_id,
//       }).lean(true);

//       const _account_status = await getFirstRow(
//         `select * from account_status where account_status = ${record.account_status}`
//       );

//       const _bank_branch = await getFirstRow(
//         `select * from bankbranch where bankbranch_id = ${record.bankbranch_id}`
//       );

//       await Account.updateOne(
//         {
//           account_id: record.account_id,
//         },
//         {
//           $set: {
//             ...record,
//             date_birth: toDate(record.date_birth),

//             branch,
//             account_status: _account_status?.accountstatus
//               ? _account_status.accountstatus
//               : null,
//             bank,
//             date_atm_in: toDate(record.date_atm_in),
//             date_atm_out: toDate(record.date_atm_out),
//             date_loan: toDate(record.date_loan),
//             date_birth_com1: toDate(record.date_birth_com1),
//             date_birth_com2: toDate(record.date_birth_com2),
//             date_birth_com3: toDate(record.date_birth_com3),
//             date_wifey: toDate(record.date_wifey),
//             date_birthb1: toDate(record.date_birthb1),
//             date_birthb2: toDate(record.date_birthb2),
//             date_birthb3: toDate(record.date_birthb3),
//             collection_type,
//             claim_type,
//             date_expiry: toDate(record.date_expiry),
//             branch_manager,
//             sales_consultant,
//             bank_branch: _bank_branch?.bankbranch
//               ? _bank_branch.bank_branch
//               : null,

//             date_spend: toDate(record.date_spend),
//             date_mature1: toDate(record.date_mature1),
//             date_mature2: toDate(record.date_mature2),
//             date_mature3: toDate(record.date_mature3),
//             tdate: toDate(record.tdate),
//             area,
//             bank2,
//             account_group,
//           },
//         },
//         {
//           upsert: true,
//         }
//       );
//     });

//     offset += increment;
//   }
//   console.log("Done importing accounts.");
// })();
