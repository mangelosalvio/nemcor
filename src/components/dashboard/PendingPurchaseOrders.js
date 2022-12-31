import React, { useEffect, useState } from "react";
import { addKeysToArray } from "../../utils/utilities";
import { Table, message, Space, Button } from "antd";
import numberFormat from "../../utils/numberFormat";
import moment from "moment";
import axios from "axios";
import { sumBy } from "lodash";
import round from "../../utils/round";
import { APPROVED, DISAPPROVED } from "../../utils/constants";
import { useSelector } from "react-redux";
import isEmpty from "../../validation/is-empty";

const items_column = [
  {
    title: "Item",
    dataIndex: ["stock", "name"],
  },
  {
    title: "SKU",
    dataIndex: ["stock", "sku"],
  },

  {
    title: "Qty",
    dataIndex: "case_quantity",
    align: "center",
    width: 200,
    render: (value, record) => (
      <span>{`${numberFormat(record.quantity)}`}</span>
    ),
  },

  {
    title: "UOM",
    dataIndex: ["stock", "uom"],
    align: "center",
    width: 200,
    render: (value, record) => (
      <span>{record.footer !== 1 && ` ${record?.stock?.uom}`}</span>
    ),
  },

  {
    title: "Price",
    dataIndex: "case_price",
    align: "center",
    width: 200,
    render: (value, record) => (
      <span>{record.footer !== 1 && `${numberFormat(record.price)}`}</span>
    ),
  },

  {
    title: "Amount",
    dataIndex: "amount",
    align: "right",
    width: 100,
    render: (value) => <span>{numberFormat(value)}</span>,
  },
];

export default function PendingPurchaseOrders() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useSelector((state) => state.auth);

  const onApprovalAction = ({ record, approval_status, user }) => {
    const form_data = {
      record,
      approval_status,
      user,
    };
    const loading = message.loading("Processing...");
    axios
      .post(`/api/purchase-orders/${record._id}/update-status`, form_data)
      .then((response) => {
        loading();
        message.success(`PO was ${approval_status}`);

        setRecords(records.filter((o) => o._id !== record._id));
      })
      .catch((err) => {
        loading();
        message.error("There was an error processing your request");
      });
  };

  const records_column = [
    {
      title: "PO #",
      dataIndex: "po_no",
      width: 100,
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date) => moment(date).format("MM/DD/YYYY"),
      width: 100,
    },

    {
      title: "Supplier",
      dataIndex: ["supplier", "name"],
      width: 150,
    },

    {
      title: "Total Amount",
      dataIndex: ["total_amount"],
      width: 100,
      align: "right",
      render: (value) => numberFormat(value),
    },

    {
      title: "Action",
      key: "action",
      render: (text, record) => (
        <div>
          <Button
            size="small"
            onClick={() =>
              onApprovalAction({
                record,
                approval_status: APPROVED,
                user: auth.user,
              })
            }
          >
            Approve
          </Button>
          <Button
            className="m-l-1"
            danger
            size="small"
            onClick={() =>
              onApprovalAction({
                record,
                approval_status: DISAPPROVED,
                user: auth.user,
              })
            }
          >
            Disapprove
          </Button>
        </div>
      ),
      align: "center",
    },
  ];

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/purchase-orders/pending")
      .then((response) => {
        setLoading(false);
        if (response.data) {
          setRecords(response.data);
        }
      })
      .catch((err) => {
        setLoading(false);
        message.error("There was an error processing your request");
      });

    return () => {};
  }, []);
  return (
    <div>
      <span className="has-text-weight-bold">Pending Purchase Orders</span>
      <Table
        scroll={{ y: 500 }}
        loading={loading}
        dataSource={addKeysToArray([...records])}
        columns={records_column}
        pagination={false}
        expandedRowRender={(record) => (
          <div>
            <Table
              dataSource={addKeysToArray([
                ...record.items,
                {
                  footer: 1,
                  quantity: sumBy(record.items, (o) => round(o.quantity)),
                  case_quantity: sumBy(record.items, (o) =>
                    round(o.case_quantity)
                  ),

                  amount: sumBy(record.items, (o) => round(o.amount)),
                },
              ])}
              columns={items_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />
          </div>
        )}
      />
    </div>
  );
}
