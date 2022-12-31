import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";

import { Layout, Table, message, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import numberFormat from "./../../utils/numberFormat";
import ReactToPrint from "react-to-print";
import SaleVoidReasonModal from "../SaleVoidReasonModal";
import ReportHeading from "../../utils/ReportHeading";
import ReportFooter from "../../utils/ReportFooter";
import isEmpty from "../../validation/is-empty";
import {
  authenticateAdmin,
  authenticateOwner,
} from "../../utils/authentications";
import FileSaver from "file-saver";

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

class AllSalesListings extends Component {
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
    latest_zread_sales_id: 0,
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

  getInventory = ({ is_excel = false } = { is_excel: false }) => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
          other_set: this.props.other_set,
          is_excel,
        };
        axios
          .post(`/api/sales/all-sales-listings`, form_data, {
            ...(is_excel && { responseType: "blob" }),
          })
          .then((response) => {
            if (!is_excel) {
              this.setState({
                records: response.data.sales,
                from_datetime: moment(response.data.from_datetime),
                to_datetime: moment(response.data.to_datetime),
                loading: false,
              });
            } else {
              let blob = new Blob([response.data], {
                type: "vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8",
              });
              FileSaver.saveAs(blob, "all-sales-listings.xlsx");
              message.success("Virtual Receipts Download");
            }
          });
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
    axios
      .post("/api/sales/reprint", {
        ...record,
        other_set: this.props.other_set,
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
            other_set: this.props.other_set,
          },
        })
        .then((response) => {
          message.success("Sale voided");
          this.getInventory();
        });
    });
  };

  render() {
    let records = [...this.state.records];
    const valid_sales = records.filter((o) => isEmpty(o.deleted));

    const net_of_returns = sumBy(valid_sales, (o) => o.summary.net_of_returns);
    const total_returns = sumBy(valid_sales, (o) => o.summary.total_returns);
    const less_vat = sumBy(valid_sales, (o) => o.summary.less_vat);
    const less_sc_disc = sumBy(valid_sales, (o) => o.summary.less_sc_disc);
    const discount_amount = sumBy(
      valid_sales,
      (o) => o.summary.discount_amount
    );
    const vat_exempt_amount = sumBy(
      valid_sales,
      (o) => o.summary.vat_exempt_amount
    );
    const vatable_amount = sumBy(valid_sales, (o) => o.summary.vatable_amount);
    const vat_amount = sumBy(valid_sales, (o) => o.summary.vat_amount);
    const non_vatable_amount = sumBy(
      valid_sales,
      (o) => o.summary.non_vatable_amount
    );
    const zero_rated_amount = sumBy(
      valid_sales,
      (o) => o.summary.zero_rated_amount
    );
    const net_amount = sumBy(valid_sales, (o) => o.summary.net_amount);

    const summary = {
      summary: {
        net_of_returns,
        total_returns,
        less_vat,
        less_sc_disc,
        discount_amount,
        vat_exempt_amount,
        vatable_amount,
        vat_amount,
        non_vatable_amount,
        zero_rated_amount,
        net_amount,
      },
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
        title: "DATE/TIME",
        dataIndex: "datetime",
        render: (date, record) => (
          <span>
            {record.footer !== 1 && moment(date).format("M/D/YY hh:mm A")}
          </span>
        ),
      },
      {
        title: "OS#",
        dataIndex: "sales_id",
      },
      {
        title: "TRANS#",
        dataIndex: "trans_id",
      },
      {
        title: "GROSS AMOUNT",
        dataIndex: ["summary", "net_of_returns"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },

      {
        title: "LESS VAT SC/PWD",
        dataIndex: ["summary", "less_vat"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS SC DISCOUNT",
        dataIndex: ["summary", "less_sc_disc"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "LESS DISCOUNT",
        dataIndex: ["summary", "discount_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT EXEMPT",
        dataIndex: ["summary", "vat_exempt_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT SALES",
        dataIndex: ["summary", "vatable_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "VAT AMOUNT",
        dataIndex: ["summary", "vat_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "NON VAT",
        dataIndex: ["summary", "non_vatable_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "ZERO RATED",
        dataIndex: ["summary", "zero_rated_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "NET AMOUNT DUE",
        dataIndex: ["summary", "net_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "STATUS",
        dataIndex: ["summary", "deleted"],
        align: "center",
        render: (deleted, record) => (
          <span>{record.footer !== 1 && record.deleted && "VOIDED"}</span>
        ),
      },
      {
        title: "",
        width: 20,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <i
                className="fa-solid fa-pen-to-square"
                onClick={() => this.onCheckSale(record, index)}
              ></i>
            )}
          </span>
        ),
      },
      {
        title: "",
        width: 20,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <i
                className="fa-solid fa-copy"
                onClick={() => {
                  window.open(`/print/order-slip/${record._id}`, "_tab");
                }}
              ></i>
            )}
          </span>
        ),
      },

      {
        title: "",
        width: 30,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <i
                className="fa-solid fa-print"
                onClick={() => this.onReprintSale(record, index)}
              ></i>
            )}
          </span>
        ),
      },
      {
        title: "",
        width: 30,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 &&
              record.sales_id > this.state.latest_zread_sales_id && (
                <i
                  className="fa-solid fa-trash"
                  onClick={() => this.onVoidSale(record, index)}
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
              <Breadcrumb.Item>All Sales Listings</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal
            ref={this.salesPreviewModal}
            other_set={this.props.other_set}
          />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              All SALES LISTINGS
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
                  <Button shape="round" type="primary">
                    Print
                  </Button>
                )}
                bodyclassName="print"
                content={() => this.report}
              />
              {/* <Button
                className="m-l-1"
                shape="round"
                onClick={() => this.getInventory({ is_excel: true })}
              >
                Download Excel
              </Button> */}
            </Form.Item>
          </div>
          <div ref={(el) => (this.report = el)}>
            <div className="report-heading">
              <ReportHeading />
              <span className="has-text-weight-bold">
                All Sales Listing Report
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

export default connect(mapToState)(AllSalesListings);
