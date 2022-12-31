import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";
import { Layout, Table, Icon, Form, Button, message, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import numberFormat from "./../../utils/numberFormat";
import ReactToPrint from "react-to-print";
import SaleVoidReasonModal from "../SaleVoidReasonModal";

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

class AccountPaymentListings extends Component {
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

  constructor(props) {
    super(props);
    this.salesPreviewModal = React.createRef();
    this.saleVoidReasonModal = React.createRef();
  }

  componentDidMount() {
    this.getInventory();
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
        };
        axios
          .post(`/api/account-payments/listings`, form_data)
          .then((response) =>
            this.setState({ records: response.data, loading: false })
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

  onVoid = (record, index) => {
    this.saleVoidReasonModal.current.open((reason) => {
      const form_data = {
        user: this.props.auth.user,
        reason,
      };

      axios
        .delete(`/api/account-payments/${record._id}`, {
          data: {
            ...form_data,
          },
        })
        .then((response) => {
          message.success("Transaction Voided");
          const records = [...this.state.records];
          records.splice(index, 1);
          this.setState({ records });
        });
    });
  };

  render() {
    let records = [...this.state.records];

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

    const records_column = [
      {
        title: "Date",
        dataIndex: "datetime",
        render: (date, record) => (
          <span>
            {record.footer !== 1 && moment(date).format("M/D/YY hh:mm A")}
          </span>
        ),
      },
      {
        title: "AP#",
        dataIndex: "account_payment_id",
      },
      {
        title: "ACCOUNT",
        dataIndex: "account.name",
      },
      {
        title: "PAYMENT TYPE",
        dataIndex: "payment_type",
      },
      {
        title: "CARD",
        dataIndex: "credit_card.card",
      },
      {
        title: "CARD NO.",
        dataIndex: "credit_card.card_number",
      },
      {
        title: "REF NO.",
        dataIndex: "credit_card.reference_number",
      },

      {
        title: "APPRV CODE",
        dataIndex: "credit_card.approval_code",
      },

      {
        title: "AMOUNT ",
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
              <Icon
                type="delete"
                theme="filled"
                className="pointer"
                onClick={() => this.onVoid(record, index)}
              />
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
              <Breadcrumb.Item>Account Payments</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <SalesPreviewModal ref={this.salesPreviewModal} />
        <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              ACCOUNT PAYMENT LISTINGS
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
            <div className="has-text-centered report-heading">
              Account Payment Listings <br />
              {this.state.period_covered[0] &&
                this.state.period_covered[1] &&
                `${moment(this.state.period_covered[0]).format(
                  "ll"
                )} - ${moment(this.state.period_covered[1]).format(
                  "ll"
                )} `}{" "}
            </div>
            <Table
              size="small"
              dataSource={records}
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

export default connect(mapToState)(AccountPaymentListings);
