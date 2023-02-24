import React from "react";

import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import RegistrationForm from "../components/RegistrationForm";
import PrivateRoute from "../components/PrivateRoute";
import StockForm from "../components/products/StockForm";
import MenuComponent from "../components/MenuComponent";

import AccountSettingsForm from "../components/accounting/AccountSettingsForm";
import UpdatePasswordForm from "../utils/UpdatePasswordForm";
import Users from "../components/utils/Users";

import DeveloperSettingsForm from "../components/accounting/DeveloperSettingsForm";

import MenuRoutesForm from "../components/inventory/MenuRoutesForm";
import CustomerForm from "../components/inventory/CustomerForm";

import PermissionsForm from "../components/inventory/PermissionsForm";
import Dashboard from "../components/Dashboard";

import AccountForm from "../components/products/AccountForm";

import EmployeeForm from "../components/payroll/EmployeeForm";
import AreaForm from "../components/inventory/AreaForm";
import PensionLoanForm from "../components/inventory/PensionLoanForm";
import AccountGroupForm from "../components/inventory/AccountGroupForm";
import StaffForm from "../components/inventory/StaffForm";
import BankForm from "../components/inventory/BankForm";
import BranchForm from "../components/inventory/BranchForm";
import ClaimTypeForm from "../components/inventory/ClaimTypeForm";
import AccountStatusForm from "../components/inventory/AccountStatusForm";
import CollectionTypeForm from "../components/inventory/CollectionTypeForm";
import TransactionTypeForm from "../components/inventory/TransactionTypeForm";
import RoleForm from "../components/inventory/RoleForm";
import CompanyForm from "../components/inventory/CompanyForm";
import AttendanceForm from "../components/payroll/AttendanceForm";
import PayrollForm from "../components/payroll/PayrollForm";
import DeductionForm from "../components/payroll/DeductionForm";
import ScheduledDeductionForm from "../components/payroll/ScheduledDeductionForm";
import PayrollCheckVoucherForm from "../components/payroll/PayrollCheckVoucherForm";
import CategoryForm from "../components/inventory/CategoryForm";
import StockBranchPricingForm from "../components/products/StockBranchPricingForm";
import WholesaleStockBranchPricingForm from "../components/products/WholesaleStockBranchPricingForm";
import StocksReceiving from "../components/inventory/StocksReceiving";
import StockTransferForm from "../components/inventory/StockTransferForm";
import DisplayDeliveryReceiptForm from "../components/inventory/DisplayDeliveryReceiptForm";
import DeliveryReceiptForm from "../components/inventory/DeliveryReceiptForm";
import { PAYMENT_TYPE_CASH, PAYMENT_TYPE_CHARGE } from "../utils/constants";
import PurchaseReturnForm from "../components/inventory/PurchaseReturnForm";
import ReturnStockForm from "../components/inventory/ReturnStockForm";
import CreditMemoForm from "../components/inventory/CreditMemoForm";
import BranchInventoryBalanceList from "../components/inventory/BranchInventoryBalanceList";
import StockCardReport from "../components/inventory/StockCardReport";
import InventoryAdjustmentForm from "../components/inventory/InventoryAdjustmentForm";
import PhysicalCountForm from "../components/inventory/PhysicalCountForm";
import PaymentMethodForm from "../components/inventory/PaymentMethodForm";
import CustomerCollectionForm from "../components/inventory/CustomerCollectionForm";
import StatementOfAccountForm from "../components/inventory/StatementOfAccountForm";
import CashSalesReport from "../components/inventory/CashSalesReport";
import ChargeSalesReport from "../components/inventory/ChargeSalesReport";
import CustomerCollectionReport from "../components/inventory/CustomerCollectionReport";
import ReplacementForm from "../components/inventory/ReplacementForm";

const AppRouter = () => (
  <div className="is-full-height">
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} exact={true} />
        <Route path="/" element={<LoginForm />} exact={true} />

        <Route path="/dashboard" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={Dashboard} />}
          ></Route>
        </Route>

        <Route path="/areas" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AreaForm} />}
          ></Route>
        </Route>

        <Route path="/products" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={StockForm} />}
          ></Route>
        </Route>
        <Route
          path="/stock-branch-pricing"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={StockBranchPricingForm} />}
          ></Route>
        </Route>
        <Route
          path="/wholesale-stock-branch-pricing"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={
              <MenuComponent component={WholesaleStockBranchPricingForm} />
            }
          ></Route>
        </Route>
        <Route path="/categories" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={CategoryForm} />}
          ></Route>
        </Route>

        <Route path="/accounts" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AccountForm} />}
          ></Route>
        </Route>

        <Route path="/customers" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={CustomerForm} />}
          ></Route>
        </Route>

        <Route path="/menu-routes" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={MenuRoutesForm} />}
          ></Route>
        </Route>
        <Route path="/permissions" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PermissionsForm} />}
          ></Route>
        </Route>
        <Route path="/roles" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={RoleForm} />}
          ></Route>
        </Route>

        <Route path="/update-password" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={UpdatePasswordForm} />}
          ></Route>
        </Route>

        <Route path="/account-settings" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AccountSettingsForm} />}
          ></Route>
        </Route>

        <Route path="/pension-loans" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PensionLoanForm} />}
          ></Route>
        </Route>
        <Route path="/account-groups" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AccountGroupForm} />}
          ></Route>
        </Route>

        <Route path="/users" element={<PrivateRoute />} exact={true}>
          <Route path="" element={<MenuComponent component={Users} />}></Route>
        </Route>

        {/* Reports */}

        <Route
          path="/developer-settings"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={DeveloperSettingsForm} />}
          ></Route>
        </Route>
        <Route path="/companies" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={CompanyForm} />}
          ></Route>
        </Route>
        <Route path="/payment-methods" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PaymentMethodForm} />}
          ></Route>
        </Route>

        {/* INVENTORY */}
        <Route path="/stocks-receiving" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={StocksReceiving} />}
          ></Route>
        </Route>
        <Route path="/physical-counts" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PhysicalCountForm} />}
          ></Route>
        </Route>
        <Route
          path="/customer-collections"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={CustomerCollectionForm} />}
          ></Route>
        </Route>
        <Route path="/stock-transfers" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={StockTransferForm} />}
          ></Route>
        </Route>
        <Route
          path="/replacement-receipts"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={ReplacementForm} />}
          ></Route>
        </Route>
        <Route
          path="/display-delivery-receipts"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={DisplayDeliveryReceiptForm} />}
          ></Route>
        </Route>
        <Route path="/sales-returns" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={ReturnStockForm} />}
          ></Route>
        </Route>
        <Route path="/credit-memos" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={CreditMemoForm} />}
          ></Route>
        </Route>
        <Route
          path="/inventory-adjustments"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={InventoryAdjustmentForm} />}
          ></Route>
        </Route>
        <Route
          path="/reports/statement-of-account"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={StatementOfAccountForm} />}
          ></Route>
        </Route>
        <Route
          path="/reports/customer-collection-report"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={CustomerCollectionReport} />}
          ></Route>
        </Route>
        <Route
          path="/reports/cash-sales-report"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={CashSalesReport} />}
          ></Route>
        </Route>
        <Route
          path="/reports/charge-sales-report"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={ChargeSalesReport} />}
          ></Route>
        </Route>

        {/* <Route path="/cash-sales" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={
              <MenuComponent
                component={<DeliveryReceiptForm  />}
              />
            }
          ></Route>
        </Route> */}

        <Route path="/cash-sales" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={
              <MenuComponent
                component={DeliveryReceiptForm}
                payment_type={PAYMENT_TYPE_CASH}
              />
            }
          ></Route>
        </Route>
        <Route path="/charge-sales" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={
              <MenuComponent
                component={DeliveryReceiptForm}
                payment_type={PAYMENT_TYPE_CHARGE}
              />
            }
          ></Route>
        </Route>

        <Route path="/purchase-returns" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PurchaseReturnForm} />}
          ></Route>
        </Route>

        <Route
          path="/reports/branch-inventory-balance-list"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={BranchInventoryBalanceList} />}
          ></Route>
        </Route>
        <Route
          path="/reports/stock-card-report"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={StockCardReport} />}
          ></Route>
        </Route>

        {/* END OF INVENTORY */}

        {/* PAYROLL */}

        <Route
          path="/scheduled-deductions"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={ScheduledDeductionForm} />}
          ></Route>
        </Route>

        <Route path="/deductions" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={DeductionForm} />}
          ></Route>
        </Route>

        <Route path="/attendance" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AttendanceForm} />}
          ></Route>
        </Route>

        <Route path="/payroll" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={PayrollForm} />}
          ></Route>
        </Route>

        <Route path="/employees" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={EmployeeForm} />}
          ></Route>
        </Route>

        <Route
          path="/reports/payroll-check-voucher-form"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={PayrollCheckVoucherForm} />}
          ></Route>
        </Route>

        {/* END OF PAYROLL */}

        <Route path="/banks" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={BankForm} />}
          ></Route>
        </Route>

        <Route path="/branches" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={BranchForm} />}
          ></Route>
        </Route>

        <Route path="/claim-types" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={ClaimTypeForm} />}
          ></Route>
        </Route>
        <Route path="/account-statuses" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={AccountStatusForm} />}
          ></Route>
        </Route>
        <Route path="/collection-types" element={<PrivateRoute />} exact={true}>
          <Route
            path=""
            element={<MenuComponent component={CollectionTypeForm} />}
          ></Route>
        </Route>
        <Route
          path="/transaction-types"
          element={<PrivateRoute />}
          exact={true}
        >
          <Route
            path=""
            element={<MenuComponent component={TransactionTypeForm} />}
          ></Route>
        </Route>

        {/*
        <PrivateRoute
          path="/category-products"
          component={CategoryProducts}
          exact={true}
        />
        <PrivateRoute path="/users" component={Users} exact={true} />
        <PrivateRoute
          path="/inventories"
          component={InventoryEntryForm}
          exact={true}
        /> 
        <PrivateRoute
          path="/inventory-review"
          component={InventoryReview}
          exact={true}
        />
        <PrivateRoute
          path="/items-sold-per-category-per-day"
          component={SalesReview}
          exact={true}
        />
        <PrivateRoute
          path="/items-sold-per-category-per-day-other-set"
          component={SalesReview}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/sales-listings"
          component={SalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/sales-listings-other-set"
          component={SalesListings}
          other_set={true}
          exact={true}
        />
        <PrivateRoute
          path="/xread-listings"
          component={XreadListings}
          exact={true}
        />
        <PrivateRoute
          path="/zread-listings"
          component={ZreadListings}
          exact={true}
        />
        <PrivateRoute
          path="/xread-listings-other-set"
          component={XreadListings}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/zread-listings-other-set"
          component={ZreadListings}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/cash-count-report"
          component={CashCountReport}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/voided-sales-listings"
          component={VoidedSalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/voided-sales-listings-other-set"
          component={VoidedSalesListings}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/deleted-orders"
          component={DeletedOrders}
          exact={true}
        />
        <PrivateRoute
          path="/credit-card-sales"
          component={CreditCardSalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/credit-card-sales-other-set"
          component={CreditCardSalesListings}
          other_set={true}
          exact={true}
        />
        <PrivateRoute
          path="/gift-check-sales"
          component={GiftChecksSalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/account-sales"
          component={AccountSalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/account-payment-listings"
          component={AccountPaymentListings}
          exact={true}
        />
        <PrivateRoute
          path="/voided-account-payment-listings"
          component={VoidedAccountPaymentListings}
          exact={true}
        />
        <PrivateRoute
          path="/daily-sales-summary"
          component={DailySalesSummary}
          exact={true}
        />
        <PrivateRoute
          path="/daily-sales-summary-other-set"
          component={DailySalesSummary}
          other_set={true}
          exact={true}
        />
        <PrivateRoute path="/gift-checks" component={GiftChecks} exact={true} />
        
        <PrivateRoute
          path="/credit-cards"
          component={CreditCards}
          exact={true}
        />
        <PrivateRoute
          path="/reports/inventory-balance-report"
          component={BranchInventoryBalanceList}
          exact={true}
        />
        <Route
          path="/order"
          component={(props) => <OrderForm {...props} />}
          exact={true}
        />
        <Route
          path="/cashier"
          component={(props) => <CashierForm {...props} />}
          exact={true}
        />
        <PrivateRoute
          path="/sales-summary"
          component={SalesSummary}
          exact={true}
        />
        
        <PrivateRoute
          path="/developer-settings"
          component={DeveloperSettingsForm}
          exact={true}
        />
        
        <PrivateRoute
          path="/raw-materials-inventory"
          component={RawMaterialsInventory}
          exact={true}
        />
        <PrivateRoute
          path="/discounted-sales-listings"
          component={DiscountedSalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/discounted-sales-listings-other-set"
          component={DiscountedSalesReport}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/sales-returns-listings"
          component={SalesReturnsReport}
          exact={true}
        />
        <PrivateRoute
          path="/virtual-receipts"
          component={VirtualReceiptsDownload}
          exact={true}
        />
        <PrivateRoute
          path="/all-sales-listings"
          component={AllSalesListings}
          exact={true}
        />
        <PrivateRoute
          path="/sales-payment-breakdown"
          component={SalesPaymentBreakdown}
          exact={true}
        />
        <PrivateRoute
          path="/sales-payment-breakdown-other-set"
          component={SalesPaymentBreakdown}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/all-sales-listings-other-set"
          component={AllSalesListings}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/foc-sales-report"
          component={FreeOfChargeSalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/foc-sales-report-other-set"
          component={FreeOfChargeSalesReport}
          other_set={true}
          exact={true}
        />
        <PrivateRoute
          path="/gross-sales-report"
          component={GrossSalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/category-sales-report"
          component={CategorySalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/category-sales-detailed-report"
          component={CategorySalesDetailedReport}
          exact={true}
        />
        <PrivateRoute
          path="/charge-to-account-report"
          component={ChargeToAccountReport}
          exact={true}
        />
        <PrivateRoute
          path="/online-payments-report"
          component={OnlinePaymentsReport}
          exact={true}
        />
        <PrivateRoute
          path="/charge-to-account-report-other-set"
          component={ChargeToAccountReport}
          other_set={true}
          exact={true}
        />
        <PrivateRoute
          path="/consolidated-net-sales-report"
          component={ConsolidatedNetSalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/consolidated-gross-sales-report"
          component={ConsolidatedGrossSalesReport}
          exact={true}
        />
        <PrivateRoute
          path="/gross-sales-report-other-set"
          component={GrossSalesReport}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/sales-by-day-report"
          component={SalesByDayReport}
          exact={true}
        />
        <PrivateRoute
          path="/consolidated-sales-by-day-report"
          component={ConsolidatedSalesByDayReport}
          exact={true}
        />
        <PrivateRoute
          path="/sales-by-day-report-other-set"
          component={SalesByDayReport}
          exact={true}
          other_set={true}
        />
        <PrivateRoute
          path="/audit-trail-report"
          component={AuditTrailReport}
          exact={true}
        />
        
        <PrivateRoute path="/suppliers" component={SupplierForm} exact={true} />
        
        <PrivateRoute
          path="/inventory-adjustments"
          component={InventoryAdjustmentForm}
          exact={true}
        />
        <PrivateRoute
          path="/physical-counts"
          component={PhysicalCountForm}
          exact={true}
        />
        <PrivateRoute
          path="/stocks-receiving/:id"
          component={StocksReceiving}
          exact={true}
        />
        <PrivateRoute
          path="/stocks-receiving"
          component={StocksReceiving}
          exact={true}
        />
        <Route
          path="/stocks-receiving-staff"
          element={<StocksReceiving />}
          exact={true}
        />
        <PrivateRoute
          path="/reports/stocks-receiving-history"
          component={StocksReceivingHistory}
          exact={true}
        />
        <PrivateRoute
          path="/reports/inventory-adjustments-history"
          component={InventoryAdjustmentsHistory}
          exact={true}
        />
        <PrivateRoute
          path="/reports/inventory-ledger"
          component={InventoryLedgerReport}
          exact={true}
        />
        <PrivateRoute
          path="/reports/inventory-balance-list"
          component={BranchInventoryBalanceList}
          exact={true}
        />
        <PrivateRoute
          path="/reports/stock-card"
          component={StockCardReport}
          exact={true}
        />
        
        <Route
          path="/print/stocks-receiving/:id"
          element={({ match }) => <ReceivingReportPrintout match={match} />}
          exact={true}
        />
        <Route
          path="/print/physical-counts/:id"
          children={({ match }) => <PhysicalCountPrintout match={match} />}
          exact={true}
        />
        >
        <Route
          path="/register"
          component={(props) => <RegistrationForm {...props} />}
          exact={true}
        /> */}
      </Routes>
    </BrowserRouter>
  </div>
);

export default AppRouter;
