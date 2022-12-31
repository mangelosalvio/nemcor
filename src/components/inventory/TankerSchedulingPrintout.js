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
import {
  DELIVERY_TYPE_DELIVERED_BY_SUPPLIER,
  DELIVERY_TYPE_PICKUP_BY_CUSTOMER,
  SOURCE_DEPOT,
} from "../../utils/constants";

const { Content } = Layout;

const title = "TANKER SCHEDULING";
const url = "/api/tanker-withdrawals/";
const date_fields = ["date"];

const records_column = [
  {
    title: "SO#",
    dataIndex: ["so_no"],
    align: "center",
    width: 50,
  },
  {
    title: "Customer",
    dataIndex: ["customer", "name"],
  },
  {
    title: "Item",
    dataIndex: ["stock", "name"],
  },

  {
    title: "Qty",
    dataIndex: "quantity",
    align: "center",
    width: 80,
    render: (value, record) => (
      <span>{`${numberFormat(record.quantity)}`}</span>
    ),
  },

  {
    title: "UOM",
    dataIndex: ["unit_of_measure", "unit"],
    align: "center",
    width: 100,
  },

  {
    title: "Price",
    dataIndex: "price",
    align: "center",
    width: 80,
    render: (value, record) => (
      <span>{record.footer !== 1 && `${numberFormat(record.price)}`}</span>
    ),
  },

  {
    title: "Amount",
    dataIndex: "amount",
    align: "right",
    width: 80,
    render: (value) => <span>{numberFormat(value)}</span>,
  },
  {
    title: "Unit",
    dataIndex: ["unit", "name"],
    align: "center",
    width: 80,
  },
];

export default function TankerSchedulingPrintout({
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

  const params = useParams();

  useEffect(() => {
    window.addEventListener("afterprint", (event) => {
      axios
        .post(`${url}${params.id}/print-status`, {
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
      record: { _id: params.id },
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
            TS#:
          </Col>
          <Col span={8} className="is-flex align-items-flex-end">
            <span className="ref-number">{state.tw_no}</span>
          </Col>
        </Row>
        <Row>
          <Col key="label" span={4}>
            Source:
          </Col>
          <Col key="value" span={8} className="report-customer-name">
            {state.source_withdrawal}
          </Col>
          {state.source_withdrawal === SOURCE_DEPOT && [
            <Col key="label" span={4}>
              Tank Farm:
            </Col>,
            <Col key="value" span={8}>
              {state.warehouse?.name}
            </Col>,
          ]}
        </Row>

        <Row>
          <Col key="label" span={4}>
            Tanker
          </Col>
          <Col key="value" span={8}>
            {state.tanker?.plate_no}
          </Col>
          <Col key="label" span={4}>
            Capacity:
          </Col>
          <Col key="value" span={8}>
            {numberFormat(state.tanker?.capacity)}
          </Col>
        </Row>

        <Row>
          <Col span={4}>Remarks</Col>
          <Col span={8} className="pre-wrap">
            {state.remarks}
          </Col>
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
