import React, { Component } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "../../styles/Autosuggest.css";

import { Layout, message, Form, Button, Breadcrumb } from "antd";
import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import moment from "moment";
import RangeDatePickerFieldGroup from "../../commons/RangeDatePickerFieldGroup";
import SalesPreviewModal from "../SalesPreviewModal";
import SaleVoidReasonModal from "../SaleVoidReasonModal";
import FileSaver from "file-saver";
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

class VirtualReceiptsDownload extends Component {
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
          .post(`/api/sales/xread-listings`, form_data)
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

  onGenerate = () => {
    const loading = message.loading("Processing...");
    const form_data = {
      dates: this.state.period_covered,
      user: this.props.auth.user,
    };
    axios
      .post("/api/sales/write", form_data)
      .then((response) => {
        loading();
        const blob = new Blob([response.data]);
        FileSaver.saveAs(blob, "virtual-receipts.txt");
        message.success("Virtual Receipts Download");
      })
      .catch((err) => {
        loading();
        message.error("There was an error downloading virtual receipts.");
      });
  };

  onGenerateSalesReturns = () => {
    const loading = message.loading("Processing...");
    const form_data = {
      dates: this.state.period_covered,
      user: this.props.auth.user,
    };
    axios
      .post("/api/sales/write-returns", form_data)
      .then((response) => {
        loading();
        const blob = new Blob([response.data], {
          type: "text/plain;charset=utf-8",
        });
        FileSaver.saveAs(blob, "virtual-receipts-returns.txt");
        message.success("Virtual Receipts Download");
      })
      .catch((err) => {
        loading();
        message.error("There was an error downloading virtual receipts.");
      });
  };

  render() {
    const { errors } = this.state;

    return (
      <Content style={{ padding: "0 50px" }}>
        <div className="columns is-marginless">
          <div className="column">
            <Breadcrumb style={{ margin: "16px 0" }}>
              <Breadcrumb.Item>Reports</Breadcrumb.Item>
              <Breadcrumb.Item>Virtual Receipts Download</Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
          <SaleVoidReasonModal ref={this.saleVoidReasonModal} />
          <SalesPreviewModal ref={this.salesPreviewModal} />
          <div>
            <span className="has-text-weight-bold" style={{ fontSize: "18px" }}>
              VIRTUAL RECEIPTS (E-JOURNAL)
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
              <Button
                type="primary"
                shape="round"
                onClick={() => this.onGenerate()}
              >
                Download Sales
              </Button>

              {/* <Button
                className="m-l-1"
                type="primary"
                shape="round"
                
                onClick={() => this.onGenerateSalesReturns()}
              >
                Print Returns
              </Button> */}
            </Form.Item>
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

export default connect(mapToState)(VirtualReceiptsDownload);
