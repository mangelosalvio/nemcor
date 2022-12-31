import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";
import { sumBy } from "lodash";

import {
  Layout,
  Table,
  message,
  Icon,
  Form,
  Button,
  Breadcrumb,
  Space,
} from "antd";
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

class DiscountedSalesReport extends Component {
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

  getInventory = () => {
    this.setState(
      {
        loading: true,
      },
      () => {
        const form_data = {
          period_covered: this.state.period_covered,
          user: this.props.auth.user,
          other_set: this.props.other_set,
        };
        axios.post(`/api/sales/discounted-sales`, form_data).then((response) =>
          this.setState({
            records: response.data.sales,
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
      summary: {
        net_of_returns: sumBy(records, (o) => o.summary.net_of_returns),
        total_returns: sumBy(records, (o) => o.summary.total_returns),
        less_vat: sumBy(records, (o) => o.summary.less_vat),
        vat_exempt_amount: sumBy(records, (o) => o.summary.vat_exempt_amount),
        vatable_amount: sumBy(records, (o) => o.summary.vatable_amount),
        vat_amount: sumBy(records, (o) => o.summary.vat_amount),
        non_vatable_amount: sumBy(records, (o) => o.summary.non_vatable_amount),
        less_sc_disc: sumBy(records, (o) => o.summary.less_sc_disc),
        discount_amount: sumBy(records, (o) => o.summary.discount_amount),
        net_amount: sumBy(records, (o) => o.summary.net_amount),
      },
    };

    records = [
      ...records,
      {
        ...summary,
        footer: 1,
      },
    ];

    records = records.map((o, index) => {
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
        title: "LESS RETURNS",
        dataIndex: "summary.total_returns",
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
        title: "NON VAT AMOUNT",
        dataIndex: ["summary", "non_vatable_amount"],
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "ZERO RATED",
        dataIndex: "zero_rated",
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
        title: "REMARKS",
        dataIndex: "summary",
        align: "center",
        render: (summary, record) => {
          let display_label = [];
          if (summary.less_sc_disc > 0) {
            display_label.push("SENIOR");
          }

          if (summary.discount_amount) {
            display_label.push("STANDARD");
          }

          return <span>{record.footer !== 1 && display_label.join("/")}</span>;
        },
      },
      {
        title: "DISC DETAILS",
        dataIndex: "discount_detail",
        align: "center",
        render: (discount_detail, record) => {
          return (
            <span>
              {record.footer !== 1 &&
                discount_detail &&
                `${discount_detail.user || ""} / ${
                  discount_detail.authorized_by || ""
                } `}
            </span>
          );
        },
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
        key: "action",
        width: 100,
        align: "center",
        render: (text, record, index) => (
          <span>
            {record.footer !== 1 && (
              <Space>
                <i
                  key="1"
                  class="fa-solid fa-pen-to-square"
                  onClick={() => this.onCheckSale(record, index)}
                ></i>
                <i
                  key="2"
                  class="fa-solid fa-print"
                  onClick={() => this.onReprintSale(record, index)}
                ></i>
              </Space>
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
              <Breadcrumb.Item>Discounted Sales Listings</Breadcrumb.Item>
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
              DISCOUNTED SALES LISTINGS
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
                Discounted Sales Listing Report
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
              rowKey="key"
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

export default connect(mapToState)(DiscountedSalesReport);
