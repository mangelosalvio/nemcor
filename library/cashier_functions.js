const { sumBy } = require("lodash");
const Sales = require("../models/Sales");
const round = require("../utils/round");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");
const async = require("async");
const isEmpty = require("../validators/is-empty");
const {
  SENIOR_DISC_5_PERCENT,
  SENIOR_DISC_VAT_EXEMPTED_AND_20_PERCENT,
  SENIOR_DISC_RATIO,
  DRINKS,
  FOOD,
} = require("../config/constants");
const SuspendSale = require("../models/SuspendSale");
const { printSuspendedSale } = require("../utils/printing_functions");
const Counter = require("../models/Counter");

const ObjectId = mongoose.Types.ObjectId;
module.exports.saveToSalesOrder = ({ order }) => {
  return new Promise(async (resolve, reject) => {
    const date = moment().toDate();

    let payments = {};

    let items = [];

    order.items.forEach((item) => {
      item.price = item.net_price;

      const new_item = this.onAddItem({
        item: item.product,
        quantity: item.quantity,
        // line_discount_rate: item.discount_rate,
        // line_discount_value: item.discount_value,
        price: item.net_price,
      });

      items = [...items, { ...new_item, gross_price: item.net_price }];
    });

    const {
      subtotal,
      no_of_items,
      vatable_amount,
      vat_amount,
      vat_exempt_amount,
      zero_rated_amount,
      non_vatable_amount,
      discount_amount,
      item_discount_amount,
      net_amount,
      less_vat,
      less_sc_disc,
      total_returns,
      net_of_returns,
      credit_card_total,
      online_payments_total,
      checks_total,
      free_of_charge_payments_total,
      charge_to_accounts_total,
      gift_checks_total,
      amount_due,
      no_of_drinks,
      no_of_food,
      amount_due_less_other_payments,
    } = this.getTransactionSummary({
      items,
      payments,
      discounts: [],
    });

    const form_data = {
      items,
      payments: {
        ...payments,
        credit_card_total,
        checks_total,
        online_payments_total,
        free_of_charge_payments_total,
        charge_to_accounts_total,
        gift_checks_total,
      },
      summary: {
        subtotal,
        no_of_items,
        no_of_drinks,
        no_of_food,
        vatable_amount,
        vat_amount,
        vat_exempt_amount,
        zero_rated_amount,
        non_vatable_amount,
        discount_amount,
        item_discount_amount,
        net_amount,
        less_vat,
        less_sc_disc,
        total_returns,
        net_of_returns,
        amount_due,
        credit_card_total,
        checks_total,
        online_payments_total,
        free_of_charge_payments_total,
        charge_to_accounts_total,
        gift_checks_total,
        amount_due_less_other_payments,
      },
      is_senior: false,
      senior_discount_type: null,
      customer: order.customer,
    };

    const { next } = await Counter.increment("suspend_sale_ref");

    const sale = {
      reference: next,
      datetime: moment().toDate(),
      queue_no: order.queue_no,
      seller: order.seller,
      ...form_data,
    };

    const newSale = new SuspendSale(sale);
    const suspend_sale = await newSale.save();
    // printSuspendedSale({
    //   _id: ObjectId(suspend_sale._id),
    //   SalesModel: SuspendSale,
    // });

    return resolve(true);
  });
};

module.exports.onAddItem = ({
  item,
  quantity = 1,
  line_discount_rate = 0,
  line_discount_value = 0,
  is_senior = 0,
  seniors = null,
  no_of_persons = null,
  user = null,
  authorized_by = null,
  order = null,
  price = null,
}) => {
  return this.getBreakdown({
    item,
    quantity,
    line_discount_rate,
    line_discount_value,
    is_senior,
    seniors,
    no_of_persons,
    user,
    authorized_by,
    order,
    price,
  });
};

module.exports.getBreakdown = ({
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

  /* let total_addons_amount = round(
    sumBy(item.addons || [], (o) => round(o.amount))
  ); */

  /* per_unit_price = round(per_unit_price + total_addons_amount); */

  let item_gross_amount = round(
    (item.current_price + (item?.variation?.price || 0)) * quantity
  );

  item.addons = (item?.addons || []).map((o) => {
    return {
      ...o,
      item_gross_amount: round(o.quantity * o.stock.price * quantity),
    };
  });

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
      let no_of_seniors = seniors?.length || 0;

      if (isNaN(no_of_seniors) || isNaN(no_of_persons)) {
        message.error("Specify Senior to Persons Ratio");
      }

      //SENIOR 20% DISCOUNT RATIO
      per_unit_vatable_amount =
        ((item_gross_amount / 1.12) * (no_of_persons - no_of_seniors)) /
        no_of_persons;

      const addons_gross_amount = sumBy(item.addons, (o) =>
        round(o.item_gross_amount)
      );

      per_unit_vatable_amount += addons_gross_amount / 1.12;

      //get total amount for add-ons

      /* per_unit_vat_amount = round(
          ((price / 1.12) * 0.12 * (no_of_persons - no_of_seniors)) /
            no_of_persons
        ); */

      per_unit_vat_amount = per_unit_vatable_amount * 0.12;

      per_unit_vat_exempt_amount =
        ((item_gross_amount / 1.12) * no_of_seniors) / no_of_persons;

      per_unit_less_vat = per_unit_vat_exempt_amount * 0.12;

      per_unit_less_sc_disc = per_unit_vat_exempt_amount * 0.2;

      per_unit_price =
        item_gross_amount +
        addons_gross_amount -
        per_unit_less_vat -
        per_unit_less_sc_disc;
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
    per_unit_discount_amount = round(line_discount_value);

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
    ...(line_discount_value > 0 && {
      discount_type: "VOLUNTARY",
      discount_value: line_discount_value,
      user,
      authorized_by,
    }),
  };

  return {
    product: {
      ...item,
    },
    item_gross_amount,
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

module.exports.getTransactionSummary = ({
  items,
  payments,
  discounts = [],
}) => {
  let less_vat = 0;
  let less_sc_disc = 0;
  let discount_amount = 0;
  let item_discount_amount = 0; //item discount only
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
  let amount_due_less_other_payments = 0;

  let no_of_drinks = 0;
  let no_of_food = 0;

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
  // console.log(items);
  // console.log("Net Amount " + net_amount);

  //compute for number of items here
  no_of_items = round(
    sumBy(net_of_return_items, (o) => {
      if (o.product?.quantity_not_counted) {
        return 0;
      }

      return o.quantity;
    })
  );

  //compute for number of items here

  no_of_drinks = round(
    sumBy(
      net_of_return_items.filter(
        (o) => o.product?.category?.category_type === DRINKS
      ),
      (o) => {
        if (o.product?.quantity_not_counted) {
          return 0;
        }

        return o.quantity;
      }
    )
  );
  no_of_food = round(
    sumBy(
      net_of_return_items.filter(
        (o) => o.product?.category?.category_type === FOOD
      ),
      (o) => {
        if (o.product?.quantity_not_counted) {
          return 0;
        }

        return o.quantity;
      }
    )
  );

  vatable_amount = round(sumBy(items, (o) => o.vatable_amount));
  vat_amount = round(sumBy(items, (o) => o.vat_amount));
  vat_exempt_amount = round(sumBy(items, (o) => o.vat_exempt_amount));
  zero_rated_amount = round(sumBy(items, (o) => o.zero_rated_amount));
  non_vatable_amount = round(sumBy(items, (o) => o.non_vatable_amount));

  discount_amount = round(sumBy(net_of_return_items, (o) => o.discount_amount));
  item_discount_amount = discount_amount;

  less_vat = round(sumBy(net_of_return_items, (o) => o.less_vat));
  less_sc_disc = round(sumBy(net_of_return_items, (o) => o.less_sc_disc));

  let additional_discount_amount = 0;

  if (discounts.length > 0) {
    for (let i = 0; i < discounts.length; i++) {
      const item_discount = discounts[i];
      const { discount_amount } = item_discount;

      additional_discount_amount = round(
        additional_discount_amount + discount_amount
      );
    }

    discount_amount = round(discount_amount + additional_discount_amount);

    //check if discount vouchers are over total amount due
    if (discount_amount > net_amount) {
      discount_amount = round(net_amount);
      net_amount = 0;
      vatable_amount = 0;
      vat_amount = 0;
    } else {
      net_amount = round(net_amount - additional_discount_amount);
      vatable_amount = round(
        vatable_amount - additional_discount_amount / 1.12
      );
      vat_amount = round(vatable_amount * 0.12);
    }
  }

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
    net_amount /* -
      credit_card_total -
      checks_total -
      free_of_charge_payments_total -
      charge_to_accounts_total -
      gift_checks_total -
      online_payments_total */
  );

  amount_due_less_other_payments = round(amount_due - online_payments_total);

  //compute discount here

  return {
    subtotal,
    no_of_items,
    no_of_drinks,
    no_of_food,

    vatable_amount,
    vat_amount,
    vat_exempt_amount,
    zero_rated_amount,
    non_vatable_amount,

    discount_amount,
    item_discount_amount,
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
    amount_due_less_other_payments,
  };
};
