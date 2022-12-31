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

const { Content } = Layout;

const title = "Purchase Returns";
const url = "/api/purchase-returns/";
const date_fields = ["date"];

const records_column = [
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

export default function PurchaseReturnPrintout({
  match,
  reprint = false,
  duplicate = false,
}) {
  const auth = useSelector((state) => state.auth);

  const initialValues = {
    _id: null,
    po_no: null,
    date: moment(),
    supplier: null,
    remarks: "",
    items: [],

    total_amount: 0,
    total_advance_payment: 0,
    total_creditable_advance_payment: 0,
    total_credit_advance_payment: 0,
  };

  const [state, setState] = useState(initialValues);
  const [date, setDate] = useState(null);
  const [dr_numbers, setDrNumbers] = useState([]);

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
      record: { _id: match.params.id },
      setState,
      url,
      date_fields,
    });

    return () => {};
  }, []);

  useEffect(() => {
    let drs = [];

    if (state.sales_return?.items?.length > 0) {
      drs = state.sales_return.items.map((o) => o?.sale?.sales_no);
    }

    setDrNumbers(uniq(drs));
    return () => {};
  }, [state.sales_return, setDrNumbers]);

  return (
    <Content
      className={classnames("inventory-print print", {
        "m-t-4": duplicate,
      })}
    >
      <div>
        <Row>
          <Col span={20}>
            <ReportHeading has_logo={true} has_business_name={true} />
          </Col>
          <Col span={4}>
            {(!isEmpty(state.printed) || reprint) && (
              <div className="has-text-right has-text-weight-bold">REPRINT</div>
            )}
          </Col>
        </Row>

        <div className="has-text-centered is-size-5">{title}</div>
        <Row className="m-t-1">
          <Col span={4} className="is-flex align-items-flex-end">
            Date:
          </Col>
          <Col span={8} className="is-flex align-items-flex-end">
            {moment(state.date).format("ll")}
          </Col>
          <Col span={4} className="is-flex align-items-flex-end">
            PR#:
          </Col>
          <Col span={8} className="is-flex align-items-flex-end">
            <span className="ref-number">{state.pr_no}</span>
          </Col>
        </Row>
        <Row>
          <Col key="label" span={4}>
            Supplier:
          </Col>
          <Col key="value" span={8} className="report-customer-name">
            {state.supplier?.name}
          </Col>
          <Col key="label" span={4}>
            Warehouse:
          </Col>
          <Col key="value" span={8}>
            {state.warehouse?.name}
          </Col>
        </Row>

        {dr_numbers.length > 0 && (
          <Row>
            <Col key="label" offset={12} span={4}>
              DR #:
            </Col>
            <Col key="value" span={8}>
              {dr_numbers.join("/")}
            </Col>
          </Row>
        )}

        {state.customer && [
          <Row key="address">
            <Col span={4}>Address:</Col>
            <Col span={8}>{state.customer?.address}</Col>
          </Row>,
          <Row key="terms">
            <Col span={4}>Terms:</Col>
            <Col span={8}>{state.customer?.terms}</Col>
          </Row>,
        ]}

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

              case_quantity: sumBy(state.items, (o) => round(o.case_quantity)),
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

      <div className="signatories-container">
        <Row gutter={48}>
          <Col span={8}>Prepared by</Col>
          <Col span={8}>Checked by</Col>
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
      </div>
    </Content>
  );
}
