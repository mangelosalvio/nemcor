import React, { Component, useState, useEffect } from "react";
import { connect, useSelector } from "react-redux";
import axios from "axios";

import { Layout, Row, Col, Table, message } from "antd";
import moment from "moment-timezone";
import numberFormat from "./../../utils/numberFormat";
import classnames from "classnames";
import { sumBy } from "lodash";

import ReportHeading from "../../utils/ReportHeading";
import { addKeysToArray } from "../../utils/utilities";
import round from "../../utils/round";
import { getDateTimeNow, edit } from "../../utils/form_utilities";
import isEmpty from "../../validation/is-empty";

const { Content } = Layout;

const title = "STR Form";
const url = "/api/stock-transfers/";
const date_fields = ["date", "check_date"];

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
    dataIndex: "approved_case_quantity",
    align: "center",
    width: 200,
    render: (value, record) => (
      <span>{`${numberFormat(
        record.approved_quantity
      )}`}</span>
    ),
  },
];

export default function StockTransferFormPrintout({
  match,
  reprint = false,
  duplicate = false,
}) {
  const auth = useSelector((state) => state.auth);

  const initialValues = {
    _id: null,
    stock_transfer_no: null,
    date: moment(),
    from_warehouse: auth.user?.warehouse,
    to_warehouse: null,
    remarks: "",
    items: [],
    can_generate_stock_release: false,
    can_generate_receiving_report: false,

    printed: null,
  };

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
      record: { _id: match.params.id },
      setState,
      url,
      date_fields,
    });

    return () => {};
  }, []);

  return (
    <Content
      className={classnames("inventory-print print", {
        "m-t-4": duplicate,
      })}
    >
      <div>
        <Row>
          <Col span={20}>
            <ReportHeading />
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
            STR#:
          </Col>
          <Col span={8} className="is-flex align-items-flex-end">
            <span className="ref-number">{state.stock_transfer_no}</span>
          </Col>
        </Row>
        <Row>
          <Col span={4}>From:</Col>
          <Col span={8}>{state?.from_warehouse?.name}</Col>
          <Col span={4}>To:</Col>
          <Col span={8}>{state?.to_warehouse?.name}</Col>
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
              approved_quantity: sumBy(state.items, (o) => round(o.approved_quantity)),
              case_quantity: sumBy(state.items, (o) => round(o.case_quantity)),
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
