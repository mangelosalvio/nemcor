import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";

import { Layout, Table, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import numberFormat from "./../../utils/numberFormat";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import ReactToPrint from "react-to-print";
import ReportFooter from "../../utils/ReportFooter";
import ReportHeading from "../../utils/ReportHeading";
import {
  authenticateAdmin,
  authenticateOwner,
} from "../../utils/authentications";

const { Content } = Layout;

const collection_name = "products";

const form_data = {
  [collection_name]: [],
  _id: "",
  name: "",
  price: "",
  category: [],
  errors: {},
};

class DailySalesSummary extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    category_options: [],
    records: [],
    loading: false,
  };

  componentDidMount() {
    let authenticate = this.props.other_set
      ? authenticateOwner
      : authenticateAdmin;

    authenticate({
      role: this.props.auth.user?.role,
      history: this.props.history,
    });
    this.getInventory();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.other_set !== prevProps.other_set) {
      this.getInventory();
    }
  }

  getInventory = () => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
          other_set: this.props.other_set || false,
        };
        axios.post(`/api/sales/daily-summary`, form_data).then((response) =>
          this.setState({
            records: response.data.records,
            from_datetime: moment(response.data.from_datetime),
            to_datetime: moment(response.data.to_datetime),
            loading: false,
          })
        );
      }
    );
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  onCheckSale = (record, index) => {};

  render() {
    let records = [...this.state.records];
    records = records.map((o) => {
      return {
        datetime: o.datetime,
        from_sale_id: o.from_sale_id,
        to_sale_id: o.to_sale_id,
        gross_amount: o.gross_amount.$numberDecimal || 0,
        less_vat: o.less_vat.$numberDecimal || 0,
        vat_exempt: o.vat_exempt.$numberDecimal || 0,
        vat_sales: o.vat_sales.$numberDecimal || 0,
        vat_amount: o.vat_amount.$numberDecimal || 0,
        less_sc_disc: o.less_sc_disc.$numberDecimal || 0,
        less_disc: o.less_disc.$numberDecimal || 0,
        net_amount: o.net_amount.$numberDecimal || 0,
        /* cash_sales: o.cash_sales.$numberDecimal || 0,
        credit_card_sales: o.credit_card_sales.$numberDecimal || 0,
        account_sales: o.account_sales.$numberDecimal || 0,
        gift_check_sales: o.gift_check_sales.$numberDecimal || 0 */
      };
    });

    const summary = {
      gross_amount: sumBy(records, (o) => parseFloat(o.gross_amount)),
      less_vat: sumBy(records, (o) => parseFloat(o.less_vat)),
      vat_exempt: sumBy(records, (o) => parseFloat(o.vat_exempt)),
      vat_sales: sumBy(records, (o) => parseFloat(o.vat_sales)),
      vat_amount: sumBy(records, (o) => parseFloat(o.vat_amount)),
      less_sc_disc: sumBy(records, (o) => parseFloat(o.less_sc_disc)),
      less_disc: sumBy(records, (o) => parseFloat(o.less_disc)),
      net_amount: sumBy(records, (o) => parseFloat(o.net_amount)),
      /* cash_sales: sumBy(records, o => parseFloat(o.cash_sales)),
      credit_card_sales: sumBy(records, o => parseFloat(o.credit_card_sales)),
      account_sales: sumBy(records, o => parseFloat(o.account_sales)),
      gift_check_sales: sumBy(records, o => parseFloat(o.gift_check_sales)) */
    };

    records = [
      ...records,
      {
        ...summary,
        footer: 1,
      },
    ];

    records = (records || []).map((o, index) => {
      return {
        ...o,
        key: index,
      };
    });

    const records_column = [
      {
        title: "Date",
        dataIndex: "datetime",
        render: (date, record) => (
          <span> {record.footer !== 1 && moment(date).format("M/D/YY")}</span>
        ),
      },
      {
        title: "RANGE SI#",
        dataIndex: "from_sale_id",
        render: (text, record) => (
          <span>
            {record.footer !== 1 &&
              `${record.from_sale_id} - ${record.to_sale_id}`}
          </span>
        ),
      },
      {
        title: "GROSS AMOUNT",
        dataIndex: "gross_amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS VAT",
        dataIndex: "less_vat",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT EXEMPT",
        dataIndex: "vat_exempt",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT SALES",
        dataIndex: "vat_sales",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT AMOUNT",
        dataIndex: "vat_amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS SC DISCOUNT",
        dataIndex: "less_sc_disc",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS DISCOUNT",
        dataIndex: "less_disc",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "NET AMOUNT",
        dataIndex: "net_amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      /* {
        title: "CASH SALES",
        dataIndex: "cash_sales",
        align: "right",
        render: value => <span>{numberFormat(value)}</span>
      },
      {
        title: "CREDIT CARD SALES",
        dataIndex: "credit_card_sales",
        align: "right",
        render: value => <span>{numberFormat(value)}</span>
      },
      {
        title: "ACCOUNT SALES",
        dataIndex: "account_sales",
        align: "right",
        render: value => <span>{numberFormat(value)}</span>
      },
      {
        title: "GIFT CHECK SALES",
        dataIndex: "gift_check_sales",
        align: "right",
        render: value => <span>{numberFormat(value)}</span>
      } */
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Daily Sales Summary</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              DAILY SALES SUMMARY
            </span>
          </div>
          <hr />
          <div>
            <RangeDatePickerFieldGroup
              label="Period Covered"
              name="period_covered"
              value={this.state.period_covered}
              onChange={(dates) =>
                this.setState({ period_covered: dates }, this.getInventory)
              }
              error={errors.period_covered}
              formItemLayout={formItemLayout}
            />

            <Form.Item {...tailFormItemLayout}>
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" shape="round">
                    Print
                  </Button>
                )}
                bodyClass="print"
                content={() => this.report}
              />
            </Form.Item>
          </div>
          <div ref={(el) => (this.report = el)}>
            <div className="report-heading">
              <ReportHeading />
              <span className="has-text-weight-bold">Daily Sales Summary</span>
              <br />
              {this.state.from_datetime &&
                this.state.to_datetime &&
                `${this.state.from_datetime.format(
                  "lll"
                )} - ${this.state.to_datetime.format("lll")} `}{" "}
              <br />
              Printed By : {this.props.auth.user.name} <br />
              Date/Time Printed : {moment().format("LLL")}
            </div>
            <Table
              size="small"
              dataSource={records}
              columns={records_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />
            <div className="report-heading m-t-1">
              <ReportFooter />
            </div>
          </div>
        </div>
      </Content>
    );
  }
}

const mapToState = (state) => {
  return {
    auth: state.auth,
  };
};

export default connect(mapToState)(DailySalesSummary);
