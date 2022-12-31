import {
  SENIOR_DISC_RATIO,
  SENIOR_DISC_5_PERCENT,
  SENIOR_DISC_VAT_EXEMPTED_AND_20_PERCENT,
} from "./constants";
import { message } from "antd";
import { sumBy } from "lodash";
import round from "./round";

export const computeNetSalary = ({ ...o }) => {
  // console.log(o.deductions);
  let other_deductions = round(
    sumBy(o.deductions || [], (deduction) => parseFloat(deduction.amount))
  );

  const total_deductions = round(
    other_deductions + (o.total_premium_deductions || 0)
  );

  const net_salary_pay = round(
    (o.total_gross_salary || 0) - (total_deductions || 0)
  );

  // console.log(o.total_gross_salary, net_salary_pay);

  return {
    other_deductions,
    total_deductions,
    net_salary_pay,
  };
};

export const getBreakdown = ({
  item,
  quantity = 1,
  line_discount_rate = 0,
  line_discount_value = 0,
  is_senior = 0,
  price = 0,
  seniors = null,
  no_of_persons = null,
  user = null,
  authorized_by = null,
  order = null,
}) => {
  let vatable_amount = 0;
  let vat_amount = 0;
  let vat_exempt_amount = 0;
  let zero_rated_amount = 0;
  let non_vatable_amount = 0;
  let less_vat = 0;
  let less_sc_disc = 0;
  let discount_amount = 0;

  let per_unit_vat_amount = 0;
  let per_unit_vatable_amount = 0;
  let per_unit_non_vatable_amount = 0;
  let per_unit_vat_exempt_amount = 0;
  let per_unit_less_vat = 0;
  let per_unit_less_sc_disc = 0;
  let per_unit_discount_amount = 0;
  let per_unit_price = price ? price : item.price;

  const has_sc_discount = is_senior;

  if (item.taxable) {
    per_unit_vatable_amount = per_unit_price / 1.12;
    per_unit_vat_amount = per_unit_price - per_unit_vatable_amount;

    if (
      item.type_of_senior_discount === SENIOR_DISC_5_PERCENT &&
      has_sc_discount
    ) {
      per_unit_less_sc_disc = per_unit_price * 0.05;
      per_unit_price = per_unit_price - per_unit_less_sc_disc;

      per_unit_vatable_amount = per_unit_price / 1.12;
      per_unit_vat_amount = per_unit_price - per_unit_vatable_amount;
    } else if (
      item.type_of_senior_discount ===
        SENIOR_DISC_VAT_EXEMPTED_AND_20_PERCENT &&
      has_sc_discount
    ) {
      //SENIOR 20% DISCOUNT
      per_unit_vat_amount = 0;
      per_unit_vatable_amount = 0;
      per_unit_vat_exempt_amount = per_unit_price / 1.12;

      //per_unit_less_vat = round((per_unit_price / 1.12) * 0.12);
      per_unit_less_vat = per_unit_price - per_unit_vat_exempt_amount;
      per_unit_less_sc_disc = (per_unit_price - per_unit_less_vat) * 0.2;
      per_unit_price = round(
        per_unit_price - per_unit_less_vat - per_unit_less_sc_disc
      );
    } else if (
      item.type_of_senior_discount === SENIOR_DISC_RATIO &&
      has_sc_discount
    ) {
      let no_of_seniors = seniors.length;

      if (isNaN(no_of_seniors) || isNaN(no_of_persons)) {
        message.error("Specify Senior to Persons Ratio");
      }

      //SENIOR 20% DISCOUNT RATIO
      per_unit_vatable_amount =
        ((price / 1.12) * (no_of_persons - no_of_seniors)) / no_of_persons;

      /* per_unit_vat_amount = round(
          ((price / 1.12) * 0.12 * (no_of_persons - no_of_seniors)) /
            no_of_persons
        ); */

      per_unit_vat_amount = per_unit_vatable_amount * 0.12;

      per_unit_vat_exempt_amount =
        ((price / 1.12) * no_of_seniors) / no_of_persons;

      per_unit_less_vat = per_unit_vat_exempt_amount * 0.12;

      per_unit_less_sc_disc = per_unit_vat_exempt_amount * 0.2;

      per_unit_price = price - per_unit_less_vat - per_unit_less_sc_disc;
    }
  } else {
    per_unit_non_vatable_amount = per_unit_price;
  }

  if (line_discount_rate > 0) {
    per_unit_discount_amount = (per_unit_price * line_discount_rate) / 100;

    per_unit_price = per_unit_price - per_unit_discount_amount;

    per_unit_vatable_amount = per_unit_price / 1.12;
    per_unit_vat_amount = per_unit_price - per_unit_vatable_amount;
  } else if (line_discount_value > 0) {
    per_unit_discount_amount = line_discount_value;

    per_unit_price = per_unit_price - per_unit_discount_amount;

    per_unit_vatable_amount = per_unit_price / 1.12;
    per_unit_vat_amount = per_unit_price - per_unit_vatable_amount;
  }

  vatable_amount = round(per_unit_vatable_amount * quantity);
  vat_amount = round(per_unit_vat_amount * quantity);
  vat_exempt_amount = round(per_unit_vat_exempt_amount * quantity);
  non_vatable_amount = round(per_unit_non_vatable_amount * quantity);

  less_vat = round(per_unit_less_vat * quantity);
  less_sc_disc = round(per_unit_less_sc_disc * quantity);
  discount_amount = round(per_unit_discount_amount * quantity);

  let gross_amount = round(price * quantity);
  let net_amount = round(per_unit_price * quantity);

  const discount_detail = {
    ...(is_senior && {
      discount_type: "SENIOR",
      seniors,
      no_of_persons,
      user,
      authorized_by,
    }),
    ...(line_discount_rate > 0 && {
      discount_type: "VOLUNTARY",
      discount_rate: line_discount_rate,
      user,
      authorized_by,
    }),
  };

  return {
    product: {
      ...item,
    },
    order,
    quantity,
    price: per_unit_price,
    line_discount_rate,
    line_discount_value,

    per_unit_vat_amount,
    per_unit_vatable_amount,
    per_unit_non_vatable_amount,
    per_unit_vat_exempt_amount,
    per_unit_less_vat,
    per_unit_less_sc_disc,
    per_unit_discount_amount,
    per_unit_price,

    vatable_amount,
    vat_exempt_amount,
    zero_rated_amount,
    non_vatable_amount,
    vat_amount,

    less_vat,
    less_sc_disc,
    discount_amount,

    gross_amount,
    net_amount,
    is_senior: has_sc_discount,
    discount_detail,
  };
};

export const getTransactionSummary = ({ items, payments }) => {
  let less_vat = 0;
  let less_sc_disc = 0;
  let discount_amount = 0;
  let vatable_amount = 0;
  let vat_amount = 0;
  let vat_exempt_amount = 0;
  let non_vatable_amount = 0;
  let zero_rated_amount = 0;
  let subtotal = 0;
  let net_amount = 0;
  let no_of_items = 0;
  let total_returns = 0;
  let net_of_returns = 0;
  let amount_due = 0;

  //payments
  let credit_card_total = 0;
  let checks_total = 0;
  let online_payments_total = 0;
  let free_of_charge_payments_total = 0;
  let charge_to_accounts_total = 0;
  let gift_checks_total = 0;

  subtotal = round(sumBy(items, (o) => o.gross_amount));

  const returned_items = items.filter((o) => {
    return o.quantity < 0;
  });

  const net_of_return_items = items.filter((o) => {
    return o.quantity > 0;
  });

  total_returns = round(sumBy(returned_items, (o) => Math.abs(o.net_amount)));

  net_of_returns = round(sumBy(net_of_return_items, (o) => o.gross_amount));

  net_amount = round(sumBy(items, (o) => o.net_amount));

  no_of_items = round(sumBy(net_of_return_items, (o) => round(o.quantity)));

  vatable_amount = round(sumBy(items, (o) => o.vatable_amount));
  vat_amount = round(sumBy(items, (o) => o.vat_amount));
  vat_exempt_amount = round(sumBy(items, (o) => o.vat_exempt_amount));
  zero_rated_amount = round(sumBy(items, (o) => o.zero_rated_amount));
  non_vatable_amount = round(sumBy(items, (o) => o.non_vatable_amount));

  discount_amount = round(sumBy(net_of_return_items, (o) => o.discount_amount));

  less_vat = round(sumBy(net_of_return_items, (o) => o.less_vat));
  less_sc_disc = round(sumBy(net_of_return_items, (o) => o.less_sc_disc));

  //payments
  if ((payments?.credit_cards?.length || 0) > 0) {
    credit_card_total = round(
      sumBy(payments.credit_cards, (o) => o.credit_card.amount)
    );
  }

  if ((payments?.checks?.length || 0) > 0) {
    checks_total = round(sumBy(payments.checks, (o) => o.amount));
  }

  if ((payments?.online_payments?.length || 0) > 0) {
    online_payments_total = round(
      sumBy(payments.online_payments, (o) => o.amount)
    );
  }

  if ((payments?.free_of_charge_payments?.length || 0) > 0) {
    free_of_charge_payments_total = round(
      sumBy(payments.free_of_charge_payments, (o) => o.amount)
    );
  }

  if ((payments?.charge_to_accounts?.length || 0) > 0) {
    charge_to_accounts_total = round(
      sumBy(payments.charge_to_accounts, (o) => o.amount)
    );
  }

  if ((payments?.gift_checks?.length || 0) > 0) {
    gift_checks_total = round(sumBy(payments.gift_checks, (o) => o.amount));
  }

  amount_due = round(
    net_amount -
      credit_card_total -
      checks_total -
      online_payments_total -
      free_of_charge_payments_total -
      charge_to_accounts_total -
      gift_checks_total
  );

  return {
    subtotal,
    no_of_items,
    vatable_amount,
    vat_amount,
    vat_exempt_amount,
    zero_rated_amount,
    non_vatable_amount,
    discount_amount,
    net_amount,
    less_vat,
    less_sc_disc,
    total_returns,
    net_of_returns,

    credit_card_total,
    checks_total,
    online_payments_total,
    free_of_charge_payments_total,
    charge_to_accounts_total,
    gift_checks_total,

    amount_due,
  };
};

export const getCollectionsSummary = ({ items, payments }) => {
  let subtotal = 0;
  let net_amount = 0;
  let no_of_items = 0;
  let amount_due = 0;

  //payments
  let credit_card_total = 0;
  let checks_total = 0;
  let online_payments_total = 0;
  let free_of_charge_payments_total = 0;
  let charge_to_accounts_total = 0;
  let gift_checks_total = 0;

  subtotal = round(sumBy(items, (o) => round(o.payment_amount)));

  net_amount = round(sumBy(items, (o) => round(o.payment_amount)));

  no_of_items = items.length;

  //payments
  if ((payments?.credit_cards?.length || 0) > 0) {
    credit_card_total = round(
      sumBy(payments.credit_cards, (o) => o.credit_card.amount)
    );
  }

  if ((payments?.checks?.length || 0) > 0) {
    checks_total = round(sumBy(payments.checks, (o) => o.amount));
  }

  if ((payments?.online_payments?.length || 0) > 0) {
    online_payments_total = round(
      sumBy(payments.online_payments, (o) => o.amount)
    );
  }

  if ((payments?.free_of_charge_payments?.length || 0) > 0) {
    free_of_charge_payments_total = round(
      sumBy(payments.free_of_charge_payments, (o) => o.amount)
    );
  }

  if ((payments?.charge_to_accounts?.length || 0) > 0) {
    charge_to_accounts_total = round(
      sumBy(payments.charge_to_accounts, (o) => o.amount)
    );
  }

  if ((payments?.gift_checks?.length || 0) > 0) {
    gift_checks_total = round(sumBy(payments.gift_checks, (o) => o.amount));
  }

  amount_due = round(
    net_amount -
      credit_card_total -
      checks_total -
      online_payments_total -
      free_of_charge_payments_total -
      charge_to_accounts_total -
      gift_checks_total
  );

  return {
    subtotal,
    no_of_items,
    net_amount,

    credit_card_total,
    checks_total,
    online_payments_total,
    free_of_charge_payments_total,
    charge_to_accounts_total,
    gift_checks_total,

    amount_due,
  };
};

export const computeTotalAmount = ({
  quantity = 0,
  price = 0,
  freight_per_unit = 0,
}) => {
  const freight = parseFloat(quantity * freight_per_unit);
  const merchandise_amount = parseFloat(quantity * price);
  const amount = round(merchandise_amount + freight);
  return amount;
};

export const computeTotalAmountCement = ({
  quantity = 0,
  price = 0,
  freight_per_unit = 0,
  unit_of_measure,
}) => {
  const freight = parseFloat(
    quantity * freight_per_unit * (unit_of_measure?.packaging || 1)
  );
  const merchandise_amount = parseFloat(
    quantity * price * (unit_of_measure?.packaging || 1)
  );
  const amount = round(merchandise_amount + freight);
  return amount;
};

export const computeFreightAndAmount = ({
  quantity = 0,
  price = 0,
  freight_per_unit = 0,
}) => {
  const freight = parseFloat(quantity * freight_per_unit);
  const merchandise_amount = parseFloat(quantity * price);
  const amount = round(merchandise_amount + freight);
  return { amount, freight };
};

export const computeFreightAndAmountCement = ({
  quantity = 0,
  price = 0,
  freight_per_unit = 0,
  unit_of_measure,
}) => {
  const freight = parseFloat(
    quantity * freight_per_unit * (unit_of_measure?.packaging || 0)
  );
  const merchandise_amount = parseFloat(
    quantity * price * (unit_of_measure?.packaging || 0)
  );
  const amount = round(merchandise_amount + freight);
  return { amount, freight };
};
