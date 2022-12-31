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
  SET_ACCOUNT,
  UPDATE_TABLE,
  SELECT_ORDER,
  UPDATE_SELECTED_ORDER_QUANTITY,
  RESET,
  SET_TIEUP,
  REMOVE_TIEUP,
  SET_CUSTOMER,
  REMOVE_CUSTOMER,
} from "./../actions/types";

const pagination_variables = {
  pageCount: 1,
  page: 1,
  pageRange: 5,
  pages: 0,
};

const tableState = {
  summary: {
    is_sc: 0,
    number_of_persons: 0,
    seniors: [],
    discount_rate: 0,
  },
  payments: {
    credit_cards: [],
    gift_checks: [],
    online_payments: [],
    checks: [],
    free_of_charge_payments: [],
    charge_to_accounts: [],
  },
  is_temporary_table: false,
  customer: {
    customer_name: "",
    name: "",
    tin: "",
    address: "",
    business_style: "",
    contact_no: "",
    time: "",
  },
  tieup_information: {
    tieup: null,
    booking_reference: null,
  },
};

const defaultState = {
  categories: [],
  products: [],
  orders: [],
  table: tableState,
  change: "",
  categories_pagination: {
    ...pagination_variables,
  },
  products_pagination: {
    ...pagination_variables,
  },
  selected_category: null,
  selected_order: null,
  selected_order_index: null,
};

export default (state = defaultState, action) => {
  switch (action.type) {
    case SET_ACCOUNT:
      return {
        ...state,
        table: {
          ...state.table,
          account: action.payload,
        },
      };
    case GET_CATEGORIES:
      const form_data = {
        ...state,
        categories: action.payload.categories,
      };

      form_data.categories_pagination.pageCount = action.payload.pageCount;
      form_data.categories_pagination.page = !isNaN(action.payload.page)
        ? action.payload.page
        : 1;

      return form_data;
    case GET_PRODUCTS:
      const products_form_data = {
        ...state,
        products: action.payload.products,
        selected_category: null,
      };

      products_form_data.products_pagination.pageCount =
        action.payload.pageCount;
      products_form_data.products_pagination.page = action.payload.page;

      return products_form_data;
    case SET_TABLE:
      return {
        ...state,
        table: {
          ...tableState,
          ...action.payload,
        },
      };
    case ADD_ORDER:
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };
    case CLEAR_ORDERS:
      return {
        ...state,
        orders: [],
      };
    case SET_ORDER_QUANTITY:
      return {
        ...state,
        orders: action.payload,
      };
    case INCREMENT_ORDER:
      return {
        ...state,
        orders: action.payload,
      };
    case TRANSFER_TABLE:
      return {
        ...state,
        table: action.payload,
      };
    case CANCEL_ORDERS:
      return {
        ...state,
        table: tableState,
        orders: [],
      };
    case APPLY_SUMMARY:
      return {
        ...state,
        table: {
          ...state.table,
          ...action.payload,
        },
      };
    case PROCESS_SALE:
      return {
        ...state,
        orders: [],
        table: { ...tableState },
        change: action.payload,
      };
    case CLEAR_CHANGE:
      return {
        ...state,
        change: 0,
      };
    case GET_PRODUCTS_FROM_CATEGORY:
      return {
        ...state,
        products: action.payload.products,
        selected_category: action.payload.selected_category,
        products_pagination: {
          ...state.products_pagination,
          pageCount: action.payload.pageCount,
          page: action.payload.page,
        },
      };
    case UPDATE_TABLE:
      return {
        ...state,
        table: action.payload.table,
      };
    case SELECT_ORDER:
      return {
        ...state,
        selected_order: action.payload.selected_order,
      };
    case UPDATE_SELECTED_ORDER_QUANTITY:
      return {
        ...state,
        selected_order: action.payload.selected_order,
      };
    case RESET:
      return defaultState;
    case SET_TIEUP:
      return {
        ...state,
        table: {
          ...state.table,
          tieup_information: action.payload.tieup_information,
        },
        orders: action.payload.orders,
      };
    case REMOVE_TIEUP:
      return {
        ...state,
        table: {
          ...state.table,
          tieup_information: null,
        },
        orders: action.payload.orders,
      };
    case SET_CUSTOMER:
      return {
        ...state,
        table: {
          ...state.table,
          customer: action.payload,
        },
      };
    case REMOVE_CUSTOMER:
      return {
        ...state,
        table: {
          ...state.table,
          customer: null,
        },
      };
    default:
      return state;
  }
};
