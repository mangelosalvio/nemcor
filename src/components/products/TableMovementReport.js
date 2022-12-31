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

class TableMovementReport extends Component {
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

    this.getReport();
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
        };
        axios.post(`/api/sales/table-movement`, form_data).then((response) =>
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
      minutes: sumBy(records, (o) => o.minutes),
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
        key: "date",
        render: (date, record) => (
          <span>
            {record.footer !== 1 &&
              moment(record.start_datetime).format("dddd, LL")}
          </span>
        ),
      },
      {
        title: "Table No.",
        dataIndex: "table_no",
      },
      {
        title: "OS#",
        dataIndex: "sales_id",
      },
      {
        title: "Start Date/Time",
        dataIndex: "start_datetime",
        render: (date, record) => (
          <span>{record.footer !== 1 && moment(date).format("hh:mm A")}</span>
        ),
      },
      {
        title: "End Date/Time",
        dataIndex: "end_datetime",
        render: (date, record) => (
          <span>{record.footer !== 1 && moment(date).format("hh:mm A")}</span>
        ),
      },
      {
        title: "Minutes",
        dataIndex: "minutes",
        align: "right",
        render: (value) => <span>{numberFormat(value)}</span>,
      },
      {
        title: "",
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
      {
        title: "",
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
    ];

    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Table Movement Report</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              TABLE MOVEMENT REPORT
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
              Table Movement Report <br />
              {this.state.from_datetime &&
                this.state.to_datetime &&
                `${this.state.from_datetime.format(
                  "lll"
                )} - ${this.state.to_datetime.format("lll")} `}{" "}
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

export default connect(mapToState)(TableMovementReport);
