import React, { useEffect, useState } from "react";
import axios from "axios";
import PendingPurchaseOrders from "./dashboard/PendingPurchaseOrders";

import { USER_ADMINISTRATOR } from "../utils/constants";
import { useSelector } from "react-redux";
import logo from "./../images/nemcor.jpeg";

export default function Dashboard({ history }) {
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const auth = useSelector((state) => state.auth);

  useEffect(() => {
    if (auth.user.role !== USER_ADMINISTRATOR)
      //history.push("/transaction-dashboard");

      setLoading(true);
    axios.post("/api/dashboard/index").then((response) => {
      if (response.data) {
        setLoading(false);
        setRecords(response.data);
      }
    });
    return () => {};
  }, []);

  return (
    <div className="flex is-full-height flex-direction-column">
      <div className="flex-1  flex">
        <div className="flex-1 flex" style={{ padding: "12px" }}>
          <div className="box flex-1 is-flex justify-content-center align-items-center">
            <img
              src={logo}
              alt="logo"
              style={{ width: "100px", margin: "12px" }}
            />
            <span
              className="has-text-weight-bold "
              style={{ fontSize: "2rem" }}
            >
              NEMCOR INVENTORY/PAYROLL SYSTEM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
