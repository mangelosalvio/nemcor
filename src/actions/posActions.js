import {
  GET_CATEGORIES,
  GET_PRODUCTS,
  SET_TABLE,
  ADD_ORDER,
  CLEAR_ORDERS,
  INCREMENT_ORDER,
  SET_ORDER_QUANTITY,
  TRANSFER_TABLE,
  CANCEL_ORDERS,
  APPLY_SUMMARY,
  PROCESS_SALE,
  CLEAR_CHANGE,
  GET_PRODUCTS_FROM_CATEGORY,
  UPDATE_TABLE,
  SELECT_ORDER,
  UPDATE_SELECTED_ORDER_QUANTITY,
  RESET,
  SET_TIEUP,
  REMOVE_TIEUP,
  SET_CUSTOMER,
  REMOVE_CUSTOMER,
} from "./types";
import axios from "axios";
import numeral from "numeral";
import round from "../utils/round";
import socketIoClient from "socket.io-client";
import { SOCKET_ENDPOINT } from "../utils/constants";
import isEmpty from "../validation/is-empty";

const socket = socketIoClient(SOCKET_ENDPOINT);

export const setManualDiscount = ({
  table,
  history,
  discount_rate,
  user,
  authorized_by,
}) => (dispatch) => {
  let newTable = {
    ...table,
    summary: {
      ...table.summary,
      discount_rate: round(discount_rate / 100),
      is_sc: 0,
      number_of_persons: 0,
      seniors: [],
      user,
      authorized_by,
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
      history.push("/billing");
    })
    .catch((err) => console.log(err));
};

export const deleteTableOrder = ({ table, selected_order, history }) => (
  dispatch
) => {
  const updated_table = { ...table };

  /**
   * find index of order */

  const order_index = table.orders.findIndex((order) => {
    return order.order_id === selected_order.order_id;
  });

  const item_index = table.orders[order_index].items.findIndex((item) => {
    return item.product._id === selected_order.item.product._id;
  });

  const deleted_order = table.orders[order_index].items[item_index];

  updated_table.orders[order_index].items.splice(item_index, 1);

  const form_data = {
    table: updated_table,
    deleted_order,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });

      history.push("/billing");
    })
    .catch((err) => console.log(err));
};

export const updateTableOrder = ({ table, selected_order, history }) => (
  dispatch
) => {
  const updated_table = { ...table };

  /**
   * find index of order */

  const order_index = table.orders.findIndex((order) => {
    return order.order_id === selected_order.order_id;
  });

  const item_index = table.orders[order_index].items.findIndex((item) => {
    return item.product._id === selected_order.item.product._id;
  });

  const old_order = {
    ...updated_table.orders[order_index].items[item_index],
  };

  updated_table.orders[order_index].items[item_index].quantity =
    selected_order.item.quantity;

  updated_table.orders[order_index].items[item_index].amount =
    selected_order.item.amount;

  const updated_order = {
    ...updated_table.orders[order_index].items[item_index],
  };

  const form_data = {
    table: updated_table,
    old_order,
    updated_order,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });

      history.push("/billing");
    })
    .catch((err) => console.log(err));
};

export const updateSelectedOrderQuantity = ({ order, quantity }) => {
  const updated_order = { ...order };
  updated_order.item.quantity = quantity;
  updated_order.item.amount = round(updated_order.item.price * quantity);

  return {
    type: UPDATE_SELECTED_ORDER_QUANTITY,
    payload: {
      selected_order: updated_order,
    },
  };
};

export const selectOrder = ({ order, history }) => (dispatch) => {
  dispatch({
    type: SELECT_ORDER,
    payload: {
      selected_order: order,
    },
  });
  history.push("/update-billing-order");
};

export const updateTable = ({ table }) => (dispatch) => {
  const form_data = {
    table,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};
export const setAccount = ({ account, table }) => (dispatch) => {
  let newTable = {
    ...table,
    payments: {
      ...table.payments,
      account,
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};
export const getCategories = (page = 1) => (dispatch) => {
  axios
    .get(`/api/categories/paginate/?s=&page=${page}`)
    .then((response) => dispatch(setCategories(response.data, page)))
    .catch((err) => console.log(err));
};

export const setCategories = (data, page) => {
  return {
    type: GET_CATEGORIES,
    payload: {
      categories: data.docs,
      pageCount: data.pages,
      page: page,
    },
  };
};

export const getProducts = ({ s = "", page = 1, tieup_information = null }) => (
  dispatch
) => {
  axios
    .get(
      `/api/products/paginate/?s=${s}&page=${page}&tieup=${tieup_information?.tieup?._id}`
    )
    .then((response) => dispatch(setProducts(response.data, page)))
    .catch((err) => console.log(err));
};

export const setProducts = (data, page) => {
  return {
    type: GET_PRODUCTS,
    payload: {
      products: data.docs,
      pageCount: data.pages,
      page: page,
    },
  };
};

export const setTable = (table, history = null) => (dispatch) => {
  axios.get(`/api/tables/${table._id}`).then((response) => {
    dispatch({
      type: SET_TABLE,
      payload: response.data,
    });
    if (history) {
      history.push("/order");
    }
  });
};

export const setTableTieup = ({ table, tieup, booking_reference, history }) => (
  dispatch
) => {
  const form_data = {
    table: {
      _id: table._id,
      tieup_information: {
        tieup,
        booking_reference,
      },
    },
  };

  axios
    .post(`/api/tables/${table._id}/update-tieup`, form_data)
    .then((response) => {
      dispatch({
        type: SET_TABLE,
        payload: response.data,
      });

      history.push("/billing");
    });
};

export const removeTableTieup = ({ table }) => (dispatch) => {
  axios.post(`/api/tables/${table._id}/remove-tieup`).then((response) => {
    dispatch({
      type: SET_TABLE,
      payload: response.data,
    });
  });
};

export const addOrder = (
  product,
  quantity = 1,
  price = null,
  remarks = null
) => {
  const product_price = !isEmpty(price) ? price : product.price;

  const amount = numeral(product_price).multiply(quantity).value();

  return {
    type: ADD_ORDER,
    payload: {
      product,
      quantity,
      price: product_price,
      amount,
      remarks,
    },
  };
};

export const incrementOrder = (orders, order) => {
  const index = orders.indexOf(order);
  orders[index].quantity = numeral(orders[index].quantity).add(1).value();
  orders[index].amount = numeral(orders[index].quantity)
    .multiply(orders[index].price)
    .value();

  return {
    type: INCREMENT_ORDER,
    payload: orders,
  };
};

export const setOrderQuantity = (
  orders,
  order,
  quantity = 1,
  price = null,
  remarks = null
) => {
  let updated_orders = [...orders];
  const index = orders.indexOf(order);
  if (quantity <= 0) {
    updated_orders.splice(index, 1);
  } else {
    const product_price = !isEmpty(price) ? price : updated_orders[index].price;

    updated_orders[index].quantity = quantity;
    updated_orders[index].amount = numeral(updated_orders[index].quantity)
      .multiply(product_price)
      .value();
  }

  return {
    type: SET_ORDER_QUANTITY,
    payload: updated_orders,
  };
};

export const setTieup = ({ tieup_information, orders = [] }) => {
  let customer_orders = [...orders];

  customer_orders = customer_orders.map((o) => {
    let price = o.product.price;

    const tieup_price = o.product.tieup_prices.find((o) => {
      return o.tieup.name === tieup_information.tieup.name;
    });

    price = !isEmpty(tieup_price) ? tieup_price.price : price;

    return {
      ...o,
      price,
      amount: round(price * o.quantity),
    };
  });

  return {
    type: SET_TIEUP,
    payload: { tieup_information, orders: customer_orders },
  };
};

export const removeTieup = ({ orders }) => {
  let customer_orders = [...orders];

  customer_orders = customer_orders.map((o) => {
    let price = o.product.price;

    return {
      ...o,
      price,
      amount: round(price * o.quantity),
    };
  });

  return {
    type: REMOVE_TIEUP,
    payload: {
      orders: customer_orders,
    },
  };
};

export const setCustomer = ({ customer }) => {
  return {
    type: SET_CUSTOMER,
    payload: customer,
  };
};

export const removeCustomer = () => {
  return {
    type: REMOVE_CUSTOMER,
  };
};

export const clearOrders = () => {
  return {
    type: CLEAR_ORDERS,
  };
};

export const transferTable = (oldTable, newTable) => (dispatch) => {
  axios
    .post(`/api/tables/${oldTable._id}/transfer`, { newTable })
    .then((response) => {
      dispatch({
        type: TRANSFER_TABLE,
        payload: response.data,
      });
      socket.emit("refresh_table", true);
    })
    .catch((err) => console.log(err));
};

export const cancelOrders = ({ table, history, user }) => (disptach) => {
  axios
    .post(`/api/tables/${table._id}/cancel`, {
      user,
    })
    .then((response) => {
      disptach({
        type: CANCEL_ORDERS,
      });
      history.push("/cashier-tables");
      socket.emit("refresh_table", true);
    });
};

export const applySummary = (
  table,
  {
    discount_rate,
    is_sc,
    less_vat,
    less_sc_disc,
    less_disc,
    amount_due,
    total_amount,
  }
) => (dispatch) => {
  const summary = {
    discount_rate,
    is_sc,
    less_vat,
    less_sc_disc,
    less_disc,
    amount_due,
    total_amount,
  };
  axios
    .post(`/api/tables/${table._id}/summary`, { summary })
    .then((response) => {
      dispatch({
        type: APPLY_SUMMARY,
        payload: response.data,
      });
    });
};

export const processSale = ({
  table,
  amount,
  history,
  summary,
  user,
  print = true,
}) => (dispatch) => {
  return new Promise((resolve, reject) => {
    let newTable = {
      ...table,
      summary: {
        ...table.summary,
        ...summary,
        payment_amount: numeral(amount).value(),
      },
    };

    const change = numeral(amount)
      .subtract(newTable.summary.amount_due)
      .format("0,0.00");

    /**
     * check if there are gift checks used
     * mark the gift check used and should not be allowed to be deleted
     */

    axios
      .put("/api/sales", { table: newTable, change, user, print })
      .then((response) => {
        dispatch({
          type: PROCESS_SALE,
          payload: change,
        });

        socket.emit("refresh_table", true);
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const clearChange = (history) => (dispatch) => {
  dispatch({
    type: CLEAR_CHANGE,
    payload: 0,
  });
  history.push("/cashier-tables");
};

export const reset = () => {
  return {
    type: RESET,
  };
};

export const getProductsFromCategory = ({
  category,
  page,
  tieup_information = null,
}) => (dispatch) => {
  axios
    .get(
      `/api/categories/${category._id}/products?page=${page}tieup=${tieup_information?.tieup?._id}`
    )
    .then((response) => {
      dispatch({
        type: GET_PRODUCTS_FROM_CATEGORY,
        payload: {
          products: response.data.docs,
          selected_category: category,
          pageCount: response.data.pages,
          page,
        },
      });
    })
    .catch((err) => console.log(err));
};

export const addGiftCheck = ({ gift_check, table }) => (dispatch) => {
  let newTable = {
    ...table,
    payments: {
      ...table.payments,
      gift_checks: [...table.payments.gift_checks, gift_check],
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};

export const addCreditCard = ({ credit_card, table }) => (dispatch) => {
  table.payments = table.payments ? table.payments : {};

  let newTable = {
    ...table,
    payments: {
      ...table.payments,
      credit_cards: [...(table.payments.credit_cards || []), credit_card],
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};

export const setSeniorDiscount = ({
  seniors,
  number_of_persons,
  table,
  history,
  user = null,
  authorized_by = null,
}) => (dispatch) => {
  let newTable = {
    ...table,
    summary: {
      ...table.summary,
      number_of_persons,
      seniors,
      is_sc: 1,
      user,
      authorized_by,
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
      history.push("/billing");
    })
    .catch((err) => console.log(err));
};

export const removeDiscount = (table) => (dispatch) => {
  let newTable = {
    ...table,
    summary: {
      ...table.summary,
      number_of_persons: null,
      seniors: [],
      is_sc: 0,
      discount_rate: 0,
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};

export const removeAccount = (table) => (dispatch) => {
  let newTable = {
    ...table,
    payments: {
      ...table.payments,
      account: null,
    },
  };

  const form_data = {
    table: newTable,
  };

  axios
    .post(`/api/tables/${table._id}/update`, form_data)
    .then((response) => {
      dispatch({
        type: UPDATE_TABLE,
        payload: {
          table: response.data,
        },
      });
    })
    .catch((err) => console.log(err));
};
