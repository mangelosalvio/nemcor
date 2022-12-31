import axios from "axios";
import { debounce } from "lodash";

export const onDeductionSearch = debounce(({ value, setOptions }) => {
  getDeductions(value).then((records) => {
    setOptions((prevState) => ({
      ...prevState,
      deductions: records,
    }));
  });
}, 200);

export const getDeductions = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/deductions/listing?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onClaimTypeSearch = debounce(({ value, setOptions }) => {
  getClaimTypes(value).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        claim_types: records,
      };
    });
  });
}, 300);

export const getClaimTypes = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/claim-types/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onVesselArrivalSearch = debounce(
  ({ value, setOptions, filters = {} }) => {
    getVesselArrivals(value, filters).then((records) => {
      setOptions((prevState) => {
        return {
          ...prevState,
          vessel_arrivals: records,
        };
      });
    });
  },
  300
);

export const getVesselArrivals = (value, filters) => {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `/api/vessel-arrivals/listing/?s=${value}${
          filters?.department?._id
            ? `&department_id=${filters?.department?._id}`
            : ""
        }`
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onVesselSearch = debounce(({ value, setOptions }) => {
  getVessels({ value }).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        vessels: records,
      };
    });
  });
}, 300);

export const getVessels = ({ value }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/vessels/listings`, { value })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onDepartmentSearch = debounce(({ value, setOptions }) => {
  getDepartments({ value }).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        departments: records,
      };
    });
  });
}, 300);

export const getDepartments = ({ value }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/departments/listings`, { value })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onCompanySearch = debounce(({ value, setOptions }) => {
  getCompanies({ value }).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        companies: records,
      };
    });
  });
}, 300);

export const getCompanies = ({ value }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/companies/listings`, { value })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onBankSearch = debounce(({ value, setOptions }) => {
  getBanks({ value }).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        banks: records,
      };
    });
  });
}, 300);

export const getBanks = ({ value }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/banks/listings`, { value })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onUnitSearch = debounce(({ value, customer, setOptions }) => {
  getUnits({ value, customer }).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        units: records,
      };
    });
  });
}, 300);

export const getUnits = ({ value, customer }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/units/listings`, { value, customer })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onTankerWithdrawalSearch = debounce(
  ({ value, tanker, setOptions, filters = {} }) => {
    getTankerWithdrawals({ value, tanker, filters }).then((records) => {
      setOptions((prevState) => {
        return {
          ...prevState,
          tanker_withdrawals: records,
        };
      });
    });
  },
  300
);

export const getTankerWithdrawals = ({ value, tanker, filters = {} }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/tanker-withdrawals/list`, {
        value,
        tanker,
        ...filters,
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onSupplierWithdrawalSearch = debounce(
  ({ value, tanker, setOptions, filters = {} }) => {
    getSupplierWithdrawals({ value, tanker, filters }).then((records) => {
      setOptions((prevState) => {
        return {
          ...prevState,
          supplier_withdrawals: records,
        };
      });
    });
  },
  300
);

export const getSupplierWithdrawals = ({ value, tanker, filters = {} }) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`/api/supplier-withdrawals/list`, {
        keyword: value,
        tanker,
        ...filters,
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onPurchaseOrderSearch = debounce(
  ({ value, setOptions, filters = {} }) => {
    getPurchaseOrders(value, filters).then((records) => {
      setOptions((prevState) => {
        return {
          ...prevState,
          purchase_orders: records,
        };
      });
    });
  },
  300
);

export const getPurchaseOrders = (value, filters) => {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `/api/purchase-orders/listing/?s=${value}${
          filters?.department?._id
            ? `&department_id=${filters?.department?._id}`
            : ""
        }`
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onPurchaseOrderCementSearch = debounce(
  ({ value, setOptions, filters = {} }) => {
    getPurchaseOrdersCement(value, filters).then((records) => {
      setOptions((prevState) => {
        return {
          ...prevState,
          purchase_orders: records,
        };
      });
    });
  },
  300
);

export const getPurchaseOrdersCement = (value, filters) => {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `/api/purchase-orders-cement/listing/?s=${value}${
          filters?.department?._id
            ? `&department_id=${filters?.department?._id}`
            : ""
        }`
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onAreaSearch = debounce(({ value, setOptions }) => {
  getAreas(value).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        areas: records,
      };
    });
  });
}, 300);

export const getAreas = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/areas/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onTankerSearch = ({ value, setOptions }) => {
  getTankers(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, tankers: records }));
  });
};

export const getTankers = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/tankers/listings/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onEmployeeSearch = debounce(({ value, setOptions }) => {
  getEmployees(value).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        employees: records,
      };
    });
  });
}, 300);

export const getEmployees = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/employees/listings?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onNatureOfWorkSearch = debounce(({ value, setOptions }) => {
  getNatureOfWork(value).then((records) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        nature_of_works: records,
      };
    });
  });
}, 300);

export const getNatureOfWork = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/nature-of-works/listings?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onBranchSearch = debounce(({ value, setOptions }) => {
  getBranches(value).then((branches) => {
    setOptions((prevState) => {
      return {
        ...prevState,
        branches,
      };
    });
  });
}, 200);

export const getBranches = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/branches/listings/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onCategorySearch = ({ value, options, setOptions }) => {
  getCategories(value).then((records) => {
    let new_options = {
      ...options,
      categories: records,
    };

    setOptions(new_options);
  });
};

export const getCategories = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/categories/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onSupplierSearch = ({ value, setOptions }) => {
  getSuppliers(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, suppliers: records }));
  });
};

export const getSuppliers = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/suppliers/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onAccountSearch = ({ value, options, setOptions }) => {
  getAccounts(value).then((records) => {
    let new_options = {
      ...options,
      accounts: records,
    };

    setOptions(new_options);
  });
};

export const getAccounts = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/accounts/listing/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onStockSearch = ({ value, setOptions }) => {
  getStocks(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, stocks: records }));
  });
};

export const getStocks = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/products/listings/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onWarehouseSearch = ({ value, setOptions }) => {
  getWarehouses(value).then((records) => {
    let new_options = {
      warehouses: records,
    };
    setOptions((prevState) => ({ ...prevState, ...new_options }));
  });
};

export const getWarehouses = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/warehouses/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const addKeysToArray = (arr) => {
  return arr.map((o, index) => ({ ...o, key: index }));
};

export const onTieupSearch = debounce(({ value, options, setOptions }) => {
  getTieups(value).then((records) => {
    let new_options = {
      ...options,
      tieups: records,
    };

    setOptions(new_options);
  });
}, 300);

export const getTieups = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/tieups/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onLocationSearch = ({ value, setOptions }) => {
  getLocations(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, locations: records }));
  });
};

export const getLocations = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/locations/listing/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onAgentSearch = ({ value, setOptions }) => {
  getAgents(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, agents: records }));
  });
};

export const getAgents = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/agents/listing/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onCustomerSearch = ({ value, setOptions }) => {
  getCustomers(value).then((records) => {
    setOptions((prevState) => ({ ...prevState, customers: records }));
  });
};

export const getCustomers = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/customers/listing/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};
export const onUnitOfMeasureSearch = ({ value, setOptions }) => {
  getUnitOfMeasures(value).then((records) => {
    let new_options = {
      unit_of_measures: records,
    };

    setOptions((prevState) => ({ ...prevState, ...new_options }));
  });
};

export const getUnitOfMeasures = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/unit-of-measures/?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const onRoleSearch = ({ value, options, setOptions }) => {
  getRoles(value).then((records) => {
    let new_options = {
      roles: records,
    };

    setOptions((prevState) => ({ ...prevState, ...new_options }));
  });
};

export const getRoles = (value) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/api/roles/listing?s=${value}`)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};
