import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";

import { Layout, Table, message, Form, Button, Breadcrumb, Icon } from "antd";
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
import { USER_OWNER } from "../../utils/constants";

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

class AuditTrailReport extends Component {
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
    let authenticate = this.props.other_set
      ? authenticateOwner
      : authenticateAdmin;

    authenticate({
      role: this.props.auth.user?.role,
      history: this.props.history,
    });

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
          .post(`/api/audit-trails`, form_data)
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

  onReprintSale = (record) => {
    axios.post("/api/sales/reprint", { ...record }).then(() => {
      message.success("Receipt reprinted");
    });
  };

  onVoid = (record, index) => {
    this.saleVoidReasonModal.current.open((reason) => {
      const form_data = {
        user: this.props.auth.user,
        reason,
      };

      axios
        .delete(`/api/audit-trails/${record._id}`, {
          data: {
            ...form_data,
          },
        })
        .then((response) => {
          message.success("Audit Trail voided");
          const records = [...this.state.records];
          records.splice(index, 1);
          this.setState({ records });
        });
    });
  };

  render() {
    let records = [...this.state.records];

    /* const summary = {
      summary: {
        total_amount: sumBy(records, o => o.summary.total_amount),
        vat_discount: sumBy(records, o => o.summary.vat_discount),
        vat_exempt: sumBy(records, o => o.summary.vat_exempt),
        vat_sales: sumBy(records, o => o.summary.vat_sales),
        vat_amount: sumBy(records, o => o.summary.vat_amount),
        less_sc_disc: sumBy(records, o => o.summary.less_sc_disc),
        less_disc: sumBy(records, o => o.summary.less_disc),
        net_amount: sumBy(records, o => o.summary.net_amount)
      }
    }; */

    records = [
      ...records,
      /* {
        ...summary,
        footer: 1
      } */
    ];

    records = (records || []).map((o, index) => {
      return {
        ...o,
        key: index,
      };
    });

    let records_column = [
      {
        title: "DATE/TIME",
        dataIndex: "date",
        render: (date, record) => (
          <span>
            {record.footer !== 1 && moment(date).format("M/D/YY hh:mm A")}
          </span>
        ),
      },
      {
        title: "USER",
        dataIndex: "user.name",
      },
      {
        title: "ACTIVITY",
        dataIndex: "activity",
      },
      {
        title: "REFERENCE",
        dataIndex: "reference",
        render: (value, record) => {
          let ref = value;
          if (record.activity.includes("Order")) {
            ref = `OS#${value}`;
          } else if (record.activity.includes("Sale")) {
            ref = `OS#${value}`;
          } else if (record.activity.includes("Xread")) {
            ref = `XREAD#${value}`;
          } else if (record.activity.includes("Zread")) {
            ref = `ZREAD#${value}`;
          } else if (record.activity.includes("Senior")) {
            ref = "";
          }

          return <span>{ref}</span>;
        },
      },
      {
        title: "TRANS #",
        dataIndex: "trans_id",
      },
      {
        title: "AMOUNT",
        dataIndex: "amount",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "OLD VALUE",
        dataIndex: "old_value",
        align: "right",
        render: (value, record) => (
          <span>
            {record.old_value !== record.new_value && numberFormat(value)}
          </span>
        ),
      },
      {
        title: "NEW VALUE",
        dataIndex: "new_value",
        align: "right",
        render: (value, record) => (
          <span>
            {record.old_value !== record.new_value && numberFormat(value)}
          </span>
        ),
      },
      {
        title: "REMARKS",
        dataIndex: "remarks",
      },
    ];

    if (this.props?.auth?.user?.role === USER_OWNER) {
      records_column = [
        ...records_column,
        {
          title: "",
          width: 10,
          align: "center",
          render: (text, record, index) => (
            <span>
              {record.footer !== 1 && (
                <i
                  class="fa-solid fa-trash"
                  onClick={() => this.onVoid(record, index)}
                ></i>
              )}
            </span>
          ),
        },
      ];
    }

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Audit Trail Report</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              AUDIT TRAIL REPORT
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
              <span className="has-text-weight-bold">Audit Trail Report</span>
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

export default connect(mapToState)(AuditTrailReport);
