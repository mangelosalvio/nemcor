import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";
import { Layout, Table, Icon, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import numberFormat from "./../../utils/numberFormat";
import ReactToPrint from "react-to-print";

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

class AccountSalesListings extends Component {
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
          .post(`/api/sales/account-sales`, form_data)
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

  render() {
    let records = [...this.state.records];
    records = records.map((o) => {
      return {
        _id: o._id,
        datetime: o.datetime,
        sales_id: o.sales_id,
        name: o.payments.account.name,
        company_name: o.payments.account.company_name,
        account_debit: o.payments.account.account_debit,
      };
    });

    const summary = {
      account_debit: sumBy(records, (o) => parseFloat(o.account_debit)),
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
          <span>{record.footer !== 1 && moment(date).format("M/D/YY")}</span>
        ),
      },
      {
        title: "SI#",
        dataIndex: "sales_id",
      },
      {
        title: "ACCOUNT",
        dataIndex: "name",
      },
      {
        title: "COMPANY",
        dataIndex: "company_name",
      },
      {
        title: "AMOUNT DEBITED",
        dataIndex: "account_debit",
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
        <SalesPreviewModal ref={this.salesPreviewModal} />
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Inventory Review</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              ACCOUNT SALES
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
              Account Sales Report <br />
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

export default connect(mapToState)(AccountSalesListings);
