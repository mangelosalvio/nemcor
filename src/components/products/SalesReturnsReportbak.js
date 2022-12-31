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

class SalesReturnsReport extends Component {
  state = {
    title: "Products",
    url: "/api/products/",
    search_keyword: "",
    ...form_data,
    period_covered: [new moment(), new moment()],
    category_options: [],
    records: [],
    loading: false,
    latest_zread_sales_id: 0,
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
        axios.post(`/api/sales/sales-returns`, form_data).then((response) =>
          this.setState({
            records: response.data.returns,
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

  onReprintSale = (record) => {
    axios.post("/api/sales/reprint", { ...record }).then(() => {
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

  render() {
    let records = [...this.state.records];

    const summary = {
      items: {
        quantity: sumBy(records, (o) => o.items.quantity),
        gross_amount: sumBy(records, (o) => o.items.gross_amount),
        less_vat: sumBy(records, (o) => o.items.less_vat),
        less_sc_disc: sumBy(records, (o) => o.items.less_sc_disc),
        discount_amount: sumBy(records, (o) => o.items.discount_amount),
        net_amount: sumBy(records, (o) => o.items.net_amount),
      },
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
        title: "DATE/TIME",
        dataIndex: "datetime",
        render: (date, record) => (
          <span>
            {record.footer !== 1 && moment(date).format("M/D/YY hh:mm A")}
          </span>
        ),
      },
      {
        title: "SI#",
        dataIndex: "sales_id",
      },
      {
        title: "TRANS#",
        dataIndex: "trans_id",
      },
      {
        title: "ITEM",
        dataIndex: "items.product.name",
      },
      {
        title: "QTY",
        dataIndex: "items.quantity",
        align: "right",
        render: (value, record) => (
          <span>{record.footer !== 1 && numberFormat(Math.abs(value))}</span>
        ),
      },
      {
        title: "PRICE",
        dataIndex: "items.product.price",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "GROSS AMOUNT",
        dataIndex: "items.gross_amount",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "LESS SC VAT",
        dataIndex: "items.less_vat",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "LESS SC DISC",
        dataIndex: "items.less_sc_disc",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "LESS DISC",
        dataIndex: "items.discount_amount",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "NET AMOUNT",
        dataIndex: "items.net_amount",
        align: "right",
        render: (value) => <span>{numberFormat(Math.abs(value))}</span>,
      },
      {
        title: "REMARKS",
        dataIndex: "items.returns",
        align: "center",
        render: (returns, record) => (
          <span>
            {record.footer !== 1 &&
              `${returns && returns.sales_id} / ${returns && returns.remarks}`}
          </span>
        ),
      },
      {
        title: "",
        key: "action",
        width: 20,
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
              <Breadcrumb.Item>Sales Returns Listings</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              SALES RETURNS LISTINGS
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
              <span className="has-text-weight-bold">
                Sales Returns Listings
              </span>
              <br />
              {this.state.period_covered[0] &&
                this.state.period_covered[1] &&
                `${moment(this.state.period_covered[0]).format(
                  "ll"
                )} - ${moment(this.state.period_covered[1]).format(
                  "ll"
                )} `}{" "}
              <br />
              Printed By : {this.props.auth.user.name} <br />
              Date/Time Printed : {moment().format("LLL")}
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

export default connect(mapToState)(SalesReturnsReport);
