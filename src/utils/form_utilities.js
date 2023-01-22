import axios from "axios";
import { message } from "antd";
import isEmpty from "../validation/is-empty";
import { forOwn } from "lodash";
import moment from "moment";
import { FINALIZED } from "./constants";

/**
 *
 * @param {edit} additional fields
 * additional fields [{ setField, field }]
 */
export const edit = ({
  record,
  setState,
  setErrors,
  setRecords,
  url,
  date_fields = [],
  period_covered_fields = [],
}) => {
  axios
    .get(url + record._id)
    .then((response) => {
      let record = { ...response.data };

      //date
      forOwn(record, (value, key) => {
        if (date_fields.includes(key)) {
          record[key] = value ? moment(value) : null;
        }
      });

      forOwn(record, (value, key) => {
        if (period_covered_fields.includes(key)) {
          record[key] =
            (value || [])?.length > 0
              ? [moment(value[0]), moment(value[1])]
              : null;
        }
      });

      setState(record);

      if (setErrors) {
        setErrors({});
      }

      if (setRecords) {
        setRecords([]);
      }
    })
    .catch((err) => console.log(err));
};

export const onDelete = ({ id, url, user, cb }) => {
  axios
    .delete(url + id, {
      data: {
        user,
      },
    })
    .then((response) => {
      message.success("Transaction Deleted");
      if (cb) {
        cb();
      }
    })
    .catch((err) => {
      console.log(err);
      message.error(err.response.data.message);
    });
};

export const onAddItem = ({ item, items, setItems }) => {
  setItems([...items, item]);
};

export const onDeleteItem = ({ field, index, setState, cb }) => {
  let arr;
  setState((prevState) => {
    arr = [...prevState[field]];
    arr.splice(index, 1);
    return {
      ...prevState,
      [field]: arr,
    };
  });
  if (cb) cb(arr);
};

export const onSubmit = ({
  values,
  auth,
  url,
  setErrors,
  setState,
  date_fields = [],
  period_covered_fields = [],
  setLoading,
  set_state_on_save = true,
}) => {
  const form_data = {
    ...values,
    user: auth.user,
  };

  if (setLoading) setLoading(true);
  const loading = message.loading("Loading...", 0);

  let promise;
  const id = values._id;
  if (isEmpty(id)) {
    promise = axios.put(url, form_data);
  } else {
    promise = axios.post(url + id, form_data);
  }

  promise
    .then(({ data }) => {
      if (setLoading) setLoading(false);
      loading();
      message.success("Transaction Saved");

      //date
      forOwn(data, (value, key) => {
        if (date_fields.includes(key)) {
          data[key] = moment(value);
        }
      });

      forOwn(data, (value, key) => {
        if (period_covered_fields.includes(key)) {
          data[key] =
            (value || [])?.length > 0
              ? [moment(value[0]), moment(value[1])]
              : [];
        }
      });

      if (set_state_on_save) {
        setState(data);
      } else {
        //set only ID
        setState((prevState) => {
          return {
            ...prevState,
            _id: data._id,
          };
        });
      }
      setErrors({});
    })
    .catch((err) => {
      console.log(err);
      if (setLoading) setLoading(false);
      loading();
      message.error("You have an invalid input");
      setErrors(err.response.data);
    });
};

export const onSearch = ({
  search_keyword = "",
  url,
  page,
  page_size = 10,
  setCurrentPage,
  setRecords,
  setTotalRecords,
  setErrors,
  advance_search = {},
  additional_parameters = {},
  setSearch,
  cb = null,
}) => {
  setCurrentPage(page);
  const loading = message.loading("Loading...", 0);
  const form_data = {
    page,
    page_size,
    s: search_keyword,
    advance_search,
    ...additional_parameters,
  };

  axios
    .post(url + "paginate", form_data)
    .then((response) => {
      loading();

      setRecords([...response.data.docs]);
      setTotalRecords(response.data.total);

      if (response.data.total <= 0) {
        message.success("No records found");
      }

      if (setSearch) {
        setSearch(true);
      }

      if (cb) {
        cb();
      }
    })
    .catch((err) => {
      console.log(err);
      loading();
      message.error("There was an error processing your request");
      setErrors(err?.response?.data);
    });
};

export const onSubmitModal = ({
  values,
  setField,
  auth,
  url,
  setErrors,
  setVisible,
}) => {
  const form_data = {
    ...values,
    user: auth.user,
  };
  const loading = message.loading("Loading...", 0);
  axios
    .put(url, form_data)
    .then(({ data }) => {
      loading();
      message.success("Transaction Saved");
      setErrors({});

      setField(data);
      setVisible(false);
    })
    .catch((err) => {
      console.log(err);
      loading();
      message.error("You have an invalid input");
      setErrors(err.response.data);
    });
};

export const onChange = ({ key, value, setState }) => {
  setState((prevState) => ({
    ...prevState,
    [key]: value,
  }));
};

export const getDateTimeNow = () => {
  return new Promise((resolve, reject) => {
    axios
      .get("/api/settings/date")
      .then((response) => {
        resolve(response.data.date);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const onUpdateStatus = ({
  url,
  state,
  approval_status,
  user,
  cb,
  remarks = null,
  update_url = "update-status",
  status_key = "status",
  onPurchaseReturnCallback = null,
  others = {},
}) => {
  axios
    .post(`${url}${state._id}/${update_url}`, {
      [status_key]: {
        approval_status: approval_status,
        user,
        remarks,
      },
      status_key,
      others,
    })
    .then((response) => {
      if (cb) {
        cb();
      }
    })
    .catch((err) => {
      console.log(err);
      message.error("There was an error updating transaction status");
    });
};

export const hasAccess = ({ auth, access, location }) => {
  const length = (auth?.user?.permissions || [])
    .filter((o) => {
      /* if (location?.pathname?.startsWith(o.route)) {
        console.log(o);
        console.log(o.access);
      } */
      /* return (
        location?.pathname?.startsWith(o.route) && o.access?.includes(access)
      ); */

      return location?.pathname === o.route && o.access?.includes(access);
    })
    .map((o) => o.route).length;

  return length > 0;
};

export const onFinalize = ({
  id,
  url,
  user,
  edit,
  setState,
  setErrors,
  setRecords,
  date_fields,
}) => {
  return new Promise((resolve, reject) => {
    const form_data = {
      status: {
        approval_status: FINALIZED,
        user,
      },
    };
    axios
      .post(url + id + "/update-status", form_data)
      .then((response) => {
        message.success("Transaction Finalized", 0.1);
        edit({
          record: response.data,
          setState,
          setErrors,
          setRecords,
          url,
          date_fields,
        });
        resolve(true);
      })
      .catch((err) => {
        message.error(err.response.data.message);
        reject(err);
      });
  });
};

export const onDeleteRecord = ({ records, index, setRecords, url, user }) => {
  const arr = [...records];
  const record = { ...arr[index] };

  axios
    .delete(url + record._id, {
      data: {
        user,
      },
    })
    .then((response) => {
      message.success("Transaction Deleted");
    })
    .catch((err) => {
      message.error(err.response.data.message);
    });

  arr.splice(index, 1);
  setRecords(arr);
};
