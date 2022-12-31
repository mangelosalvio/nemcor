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

const title = "Delivery Returns";
const url = "/api/delivery-returns/";
const date_fields = ["date"];

const records_column = [
  {
    title: "Customer",
    dataIndex: ["customer", "name"],
    width: 250,
  },
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

  {
    title: "Status",
    align: "center",
    dataIndex: "stock_status",
    width: 100,
  },
];

export default function DeliveryReturnPrintout({
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
      url,
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
            </Row>
          </Col>
          <Col span={12}>
            <Row>
              <Col span={8} className="is-flex align-items-flex-end">
                RET#:
              </Col>
              <Col span={16} className="is-flex align-items-flex-end">
                <span className="ref-number">{state.dr_ret_no}</span>
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
          size="small"
          dataSource={addKeysToArray([
            ...(state.items || []),
            {
              footer: 1,

              quantity: sumBy(state.items, (o) => round(o.quantity)),
              amount: sumBy(state.items, (o) => round(o.amount)),
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

      {/* <div className="signatories-container">
        <Row gutter={48}>
          <Col span={8}>Received by</Col>
          <Col span={8}>Prepared by</Col>
          <Col span={8}>Approved by</Col>
        </Row>
        <Row gutter={48}>
          <Col span={8}>
            <div className="signatory">{state.logs?.[0]?.user?.name}</div>
          </Col>
          <Col span={8} className="has-text-centered">
            <div className="signatory">&nbsp;</div>
          </Col>
          <Col span={8}>
            <div className="signatory">&nbsp;</div>
          </Col>
        </Row>
      </div> */}
    </Content>
  );
}
