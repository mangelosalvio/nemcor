import React, { Component, useState, useEffect } from "react";
import { connect, useSelector } from "react-redux";
import axios from "axios";

import { Layout, Row, Col, Table, message } from "antd";
import moment from "moment-timezone";
import numberFormat from "./../../utils/numberFormat";

import { sumBy, uniq } from "lodash";

import ReportHeading from "../../utils/ReportHeading";
import { addKeysToArray } from "../../utils/utilities";
import round from "../../utils/round";
import { getDateTimeNow, edit } from "../../utils/form_utilities";
import isEmpty from "../../validation/is-empty";
import classnames from "classnames";
import { useParams } from "react-router-dom";

const { Content } = Layout;

const title = "Delivery Receipt";
const url = "/api/truck-tallies/";
const date_fields = ["date"];

const records_column = [
  {
    title: "Quantity",
    align: "center",
    dataIndex: "quantity",
    width: 150,
    render: (value) => numberFormat(value),
  },
  {
    title: "Item",
    dataIndex: ["stock", "name"],
    render: (name, record) => name && `${record?.stock?.sku || ""} ${name}`,
    width: 250,
  },
  {
    title: "Price",
    align: "right",
    dataIndex: "price",
    width: 150,
    render: (value) => value && numberFormat(value),
  },
  {
    title: "Amount",
    align: "right",
    dataIndex: "amount",
    width: 150,
    render: (value) => numberFormat(value),
  },
];

export default function CustomerDeliveryPrintout({
  match,
  reprint = false,
  duplicate = false,
}) {
  const auth = useSelector((state) => state.auth);

  const initialValues = {
    _id: null,
    rr_no: null,
    date: moment(),
    supplier: null,
    warehouse: auth.user?.warehouse,
    remarks: "",
    items: [],

    purchase_order: null,
    stock_release: null,
    sales_return: null,
    customer: null,
  };

  const params = useParams();
  const [state, setState] = useState(initialValues);
  const [date, setDate] = useState(null);

  useEffect(() => {
    window.addEventListener("afterprint", (event) => {
      axios
        .post(`${url}${match.params.id}/print-status`, {
          user: auth.user,
        })
        .then((response) => {
          edit({
            record: { _id: response.data._id },
            setState,
            url,
            date_fields,
          });
        });
    });

    getDateTimeNow()
      .then((date) => setDate(date))
      .catch((err) =>
        message.error("There was an error getting curent date/time")
      );

    edit({
      record: { _id: params?.id },
      setState,
      url: `${url}print/`,
      date_fields,
    });

    return () => {};
  }, []);

  useEffect(() => {
    if (state?.items.length > 0 && state._id) {
      window.print();
      window.close();
    }

    return () => {};
  }, [state.items, state._id]);

  return (
    <Content
      className={classnames("inventory-print print", {
        "m-t-4": duplicate,
      })}
    >
      {(state?.items || []).map((record) => (
        <div className="page-break-after">
          <div>
            <ReportHeading title={title} />

            <Row>
              <Col span={12}>
                <Row>
                  <Col span={8} className="is-flex align-items-flex-end">
                    Date:
                  </Col>
                  <Col span={16} className="is-flex align-items-flex-end">
                    {moment(state.date).format("ll")}
                  </Col>
                  <Col span={8} className="is-flex align-items-flex-end">
                    Customer:
                  </Col>
                  <Col span={16} className="is-flex align-items-flex-end">
                    <span className="ref-number">{record?.customer?.name}</span>
                  </Col>
                  <Col span={8} className="is-flex align-items-flex-end">
                    Location:
                  </Col>
                  <Col span={16} className="is-flex align-items-flex-end">
                    <span className="ref-number">
                      {record?.customer?.location?.name}
                    </span>
                  </Col>
                </Row>
              </Col>
              <Col span={12}>
                <Row>
                  <Col span={8} className="is-flex align-items-flex-end">
                    DS#:
                  </Col>
                  <Col span={16} className="is-flex align-items-flex-end">
                    <span className="ref-number">
                      {record.ds_no.join(", ")}
                    </span>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row>
              <Col span={4}>Remarks</Col>
              <Col span={8}>{state.remarks}</Col>
              <Col span={4}>Printed:</Col>
              <Col span={8}>{date && moment(date).format("lll")}</Col>
            </Row>
          </div>

          <div className="m-t-1">
            <Table
              className="delivery-report"
              size="small"
              dataSource={addKeysToArray([
                ...(record.items || []),
                {
                  footer: 1,

                  quantity: sumBy(record.items, (o) => round(o.quantity)),
                  amount: sumBy(record.items, (o) => round(o.amount)),
                },
              ])}
              columns={records_column}
              rowKey={(item) => item._id}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />
          </div>
          <div className="has-text-centered">
            ** Received the goods above in good order **
          </div>
        </div>
      ))}
    </Content>
  );
}
