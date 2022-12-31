import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";

import { Layout, Table, message, Icon, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import numberFormat from "./../../utils/numberFormat";
import ReactToPrint from "react-to-print";
import SaleVoidReasonModal from "../SaleVoidReasonModal";
import ReportHeading from "../../utils/ReportHeading";
import ReportFooter from "../../utils/ReportFooter";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import { addKeysToArray } from "../utils/utilities";

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

class XreadListings extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    from_datetime: null,
    to_datetime: null,
    category_options: [],
    records: [],
    loading: false,
  };

  constructor(props) {
    super(props);
    this.salesPreviewModal = React.createRef();
    this.saleVoidReasonModal = React.createRef();
  }

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
    if (prevProps.other_set !== this.props.other_set) {
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
        axios.post(`/api/sales/xread-listings`, form_data).then((response) =>
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

  onCheckSale = (record, index) => {
    this.salesPreviewModal.current.open(record);
  };

  onReprint = (record) => {
    axios
      .post("/api/sales/xread-reprint", {
        ...record,
        other_set: this.props.other_set || false,
      })
      .then(() => {
        message.success("Receipt reprinted");
      });
  };

  onVoidSale = (record, index) => {
    this.saleVoidReasonModal.current.open((reason) => {
      const form_data = {
        user: this.props.auth.user,
        reason,
      };

      axios
        .delete(`/api/sales/${record._id}`, {
          data: {
            ...form_data,
          },
        })
        .then((response) => {
          message.success("Sale voided");
          const records = [...this.state.records];
          records.splice(index, 1);
          this.setState({ records });
        });
    });
  };

  onPrintReceipts = () => {
    const form_data = {
      dates: this.state.period_covered,
      other_set: this.props.other_set || false,
    };
    axios
      .post("/api/sales/xread-range-reprint", form_data)
      .then(() => {
        message.success("Xread Printed");
      })
      .catch((err) => {
        console.log(err);
        message.error(
          "There was an error print Xread. Please try again later."
        );
      });
  };

  render() {
    let records = [...this.state.records];

    const summary = {
      net_of_returns: sumBy(records, (o) => o.net_of_returns),
      total_returns: sumBy(records, (o) => o.total_returns),
      less_vat: sumBy(records, (o) => o.less_vat),
      less_sc_disc: sumBy(records, (o) => o.less_sc_disc),
      less_disc: sumBy(records, (o) => o.less_disc),
      voided_sales: sumBy(records, (o) => o.voided_sales),
      vat_sales: sumBy(records, (o) => o.vat_sales),
      vat_exempt: sumBy(records, (o) => o.vat_exempt),
      vat_amount: sumBy(records, (o) => o.vat_amount),
      net_amount: sumBy(records, (o) => o.net_amount),

      cash_sales: sumBy(records, (o) => o.cash_sales),
      credit_card_sales: sumBy(records, (o) => o.credit_card_sales),
      check_sales: sumBy(records, (o) => o.check_sales),
      free_of_charge_sales: sumBy(records, (o) => o.free_of_charge_sales),
      online_payment_sales: sumBy(records, (o) => o.online_payment_sales),
      charge_to_account_sales: sumBy(records, (o) => o.charge_to_account_sales),
      gift_check_sales: sumBy(records, (o) => o.gift_check_sales),
      cash_count: sumBy(records, (o) => o.cash_count),
      cash_variance: sumBy(records, (o) => o.cash_variance),

      number_of_voided_invoices: sumBy(
        records,
        (o) => o.number_of_voided_invoices
      ),
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
        title: "",
        key: "action",
        width: 30,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <i
                class="fa-solid fa-print"
                onClick={() => this.onReprintSale(record, index)}
              ></i>
            )}
          </span>
        ),
      },
      {
        title: "TRANS DATE",
        dataIndex: "transaction_date",
        width: 100,
        render: (date, record) => (
          <span>{record.footer !== 1 && moment(date).format("M/D/YY")}</span>
        ),
      },
      {
        title: "PRINTED",
        dataIndex: "date_printed",
        width: 100,
        render: (date, record) => (
          <span>
            {record.footer !== 1 && moment(date).format("M/D/YY HH:mm ")}
          </span>
        ),
      },
      {
        title: "XREAD#",
        dataIndex: "xread_id",
        width: 80,
      },
      {
        title: "TRANS#",
        dataIndex: "trans_id",
        width: 80,
      },
      {
        title: "OS# RANGE",
        width: 100,
        render: (value, record) => (
          <span>
            {record.footer !== 1 &&
              `${record.from_sales_id} - ${record.to_sales_id}`}
          </span>
        ),
      },
      {
        title: "GROSS AMOUNT",
        dataIndex: "net_of_returns",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "TOTAL RETURNS",
        dataIndex: "total_returns",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS VAT SC/PWD",
        dataIndex: "less_vat",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS SC/PWD DISC",
        dataIndex: "less_sc_disc",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS DISC",
        dataIndex: "less_disc",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VOIDED SALES",
        dataIndex: "voided_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "NET AMOUNT",
        dataIndex: "net_amount",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },

      {
        title: "VAT SALES",
        dataIndex: "vat_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT EXEMPT",
        dataIndex: "vat_exempt",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT AMOUNT",
        dataIndex: "vat_amount",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "NON VAT AMOUNT",
        dataIndex: "non_vat_amount",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "ZERO RATED",
        dataIndex: "zero_rated_amount",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },

      {
        title: "CASH SALES",
        dataIndex: "cash_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "CASH COUNT",
        dataIndex: "cash_count",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VARIANCE",
        dataIndex: "cash_variance",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      /* {
        title: "CREDIT CARD SALES",
        dataIndex: "credit_card_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "CHEQUE SALES",
        dataIndex: "check_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "F.O.C SALES",
        dataIndex: "free_of_charge_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "ONLINE PAYMENT SALES",
        dataIndex: "online_payment_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "CHARGE SALES",
        dataIndex: "charge_to_account_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "G.C. SALES",
        dataIndex: "gift_check_sales",
        align: "right",
        width: 100,
        render: (value) => <span>{numberFormat(value)}</span>,
      }, */
      {
        title: "INVOICES",
        align: "right",
        width: 100,
        render: (value, record) => (
          <span>
            {record.footer !== 1 &&
              `${record.from_sales_id} - ${record.to_sales_id}`}
          </span>
        ),
      },

      {
        title: "# VOIDED INVOICES",
        dataIndex: "number_of_voided_invoices",
        width: 100,
        align: "right",
        render: (value, record) => <span>{record.footer !== 1 && value}</span>,
      },
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Xread Listings</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              XREAD LISTINGS
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
              <Button
                className="m-l-1"
                shape="round"
                onClick={() => this.onPrintReceipts()}
              >
                Print Xread Receipts
              </Button>
            </Form.Item>
          </div>
          <div ref={(el) => (this.report = el)}>
            <div className="report-heading">
              <ReportHeading />
              <span className="has-text-weight-bold">Xread Listing Report</span>
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
              dataSource={addKeysToArray(records)}
              columns={records_column}
              pagination={false}
              scroll={{
                x: "100vw",
              }}
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

export default connect(mapToState)(XreadListings);
