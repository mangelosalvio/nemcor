import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";

import { sumBy } from "lodash";
import { Layout, Table, Form, Button, Breadcrumb, Icon } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import numberFormat from "./../../utils/numberFormat";
import ReportHeading from "../../utils/ReportHeading";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import { CREDIT, DEBIT } from "../../utils/constants";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";

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

class CreditCardSalesListings extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    card_type: CREDIT,
    from_datetime: null,
    to_datetime: null,
    category_options: [],
    records: [],
    loading: false,
  };

  constructor(props) {
    super(props);
    this.salesPreviewModal = React.createRef();
  }

  componentDidMount() {
    let authenticate = this.props.other_set
      ? authenticateOwner
      : authenticateAdmin;

    authenticate({
      role: this.props.auth.user?.role,
      history: this.props.history,
    });
    this.getReport();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.other_set !== prevProps.other_set ||
      this.state.card_type !== prevState.card_type
    ) {
      this.getReport();
    }
  }

  getReport = () => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
          card_type: this.state.card_type,
          other_set: this.props.other_set || false,
        };
        axios.post(`/api/sales/credit-cards`, form_data).then((response) =>
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

  render() {
    let records = [...this.state.records];
    records = records.map((o) => {
      return {
        _id: o._id,
        table: o.table,
        datetime: o.datetime,
        sales_id: o.sales_id,
        card: o.payments.credit_cards.credit_card.card,
        bank: o.payments.credit_cards.credit_card.bank,
        reference_number: o.payments.credit_cards.credit_card.reference_number,

        approval_code: o.payments.credit_cards.credit_card.approval_code,
        amount: o.payments.credit_cards.credit_card.amount,
      };
    });

    const summary = {
      amount: sumBy(records, (o) => parseFloat(o.amount)),
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
          <span>{record.footer !== 1 && moment(date).format("M/D/YY")}</span>
        ),
      },
      {
        title: "TABLE",
        dataIndex: ["table", "name"],
        render: (value, record) => record?.table?.name,
      },
      {
        title: "OS#",
        dataIndex: "sales_id",
      },
      {
        title: "CARD",
        dataIndex: "card",
      },
      {
        title: "BANK",
        dataIndex: "bank",
      },
      {
        title: "REFERENCE",
        dataIndex: "reference_number",
      },
      {
        title: "TRACE NUMBER",
        dataIndex: "approval_code",
      },
      {
        title: "AMOUNT",
        dataIndex: "amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "",
        key: "action",
        width: 100,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <i
                class="fa-solid fa-pen-to-square"
                onClick={() => this.onCheckSale(record, index)}
              ></i>
            )}
          </span>
        ),
      },
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Credit Card Sales</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              CREDIT CARD SALES
            </span>
          </div>
          <hr />
          <div>
            <RangeDatePickerFieldGroup
              label="Period Covered"
              name="period_covered"
              value={this.state.period_covered}
              onChange={(dates) =>
                this.setState({ period_covered: dates }, this.getReport)
              }
              error={errors.period_covered}
              formItemLayout={formItemLayout}
            />

            <SimpleSelectFieldGroup
              label="Card Type"
              name="card_type"
              value={this.state.card_type}
              onChange={(value) => this.setState({ card_type: value })}
              error={errors.card_type}
              options={[CREDIT, DEBIT]}
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
              <span className="has-text-weight-bold">
                Credit Card Sales Report
              </span>
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

export default connect(mapToState)(CreditCardSalesListings);
