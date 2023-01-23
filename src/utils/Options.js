export const roles_options = [
  /* "Owner", */ "Administrator",
  "Customer Orders/Dispatch",
  "Supplier PO/Payments",
  "Customer Collections",
];

export const payment_options = ["Cash", "Credit Card"];
export const senior_discount_options = [
  "N/A",
  "VAT EXEMPTED AND 20% DISCOUNT",
  "5% DISCOUNT",
  "VAT EXEMPTED AND 20% DISC RATIO",
];
export const printer_options = [
  {
    type: "Thermal Printer",
    line_max_char: 48,
  },
  {
    type: "Dot Matrix Printer",
    line_max_char: 40,
  },
];

export const terms_options = ["COD", "15 DAYS", "30 DAYS", "M30"];

export const bank_options = ["BPI", "BDO", "METROBANK"];

export const markup_options = ["ADD-ON VALUE", "PERCENT ADD-ON"];

export const bundle_status_options = ["Bundled", "Unbundled"];
export const stock_status_options = ["Good", "Bad"];
export const pricing_options = ["Wholesale", "OOT", "Store"];
export const nature_of_work_type_options = ["Individual", "Group"];
export const area_options = ["North", "South"];
// export const delivery_type_options = [
//   "Company Delivered",
//   "Delivered by Supplier",
//   "Pickup by Customer",
// ];

export const delivery_type_options = [
  "Company Delivered",
  "Pickup-Depot",
  "Pickup-Tank Farm",
  "Own Delivery",
];

export const cement_delivery_type_options = [
  "Company Delivered",
  "Pickup-Vessel",
  "Pickup-Bodega",
  "Own Delivery",
];

// export const supplier_delivery_type_options = ["Company Delivered", "Pickup"];

export const supplier_delivery_type_options = [
  "Company Delivered",
  "Pickup Client", //customer pickup at depot
  "Own Pickup", //we pickup at depot
];

// export const source_withdrawal_options = [
//   "Supplier",
//   "Depot",
//   "Supplier/Depot",
// ];

export const source_withdrawal_options = [
  "Depot",
  "Tank Farm",
  "Depot/Tank Farm",
];

export const source_return_options = [
  "Supplier Withdrawals",
  "Tanker Scheduling",
];
export const use_options = ["Personal", "Business"];

export const payment_type_options = [
  "N/A",
  "Cash",
  "Check",
  "Telegraphic Transfer",
  "Offset",
];

export const payment_status_options = ["Cleared", "Bounced"];
export const civil_status_options = ["Single", "Married", "Widowed"];
export const kind_options = ["SSS", "GSIS"];

export const permission_options = [
  "View",
  "Open",
  "Approve",
  "Delete",
  "Cancel",
  "Print",
  "Add",
  "Update",
  "Advance Search",
  "Price Change",
];
export const product_type_options = ["Inventory", "Non-Inventory"];
export const account_type_options = [
  "Customer",
  "Consignee",
  "Supplier",
  "Branch",
];

export const customer_pricing_options = ["Retail", "Dealer"];
export const return_stock_options = ["Full Refund", "For Credit Memo"];
