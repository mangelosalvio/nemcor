import React, { Component } from "react";
import "./../styles/TableNumbers.css";
import { connect } from "react-redux";
import { getTables } from "./../actions/tableActions";
import { setTableTieup } from "./../actions/posActions";
import { logoutUser } from "./../actions/authActions";

import { withRouter } from "react-router-dom";
import { Row, Col, message, Modal } from "antd";
import axios from "axios";
import AccountPaymentForm from "./AccountPaymentForm";
import InputModal from "./InputModal";
import OptionButton from "../commons/OptionButton";

const { confirm } = Modal;

class SelectTieupForm extends Component {
  state = {
    url: "/api/tables/",
    tables: [],
    tieups: [],
  };

  constructor(props) {
    super(props);
    this.accountPaymentForm = React.createRef();
    this.bookingReferenceModal = React.createRef();
    this.selectAccountModal = React.createRef();
  }

  componentDidMount = () => {
    if (!this.props.pos?.table._id) {
      this.props.history.push("/cashier-tables");
      return;
    }

    axios.get("/api/tieups").then((response) => {
      if (response.data) {
        this.setState({ tieups: response.data });
      }
    });
  };

  onTieupSelect = (tieup) => {
    const loading = message.loading("Processing...");
    loading();

    this.bookingReferenceModal.current.open((booking_reference) => {
      this.props.setTableTieup({
        table: this.props.pos.table,
        tieup,
        booking_reference,
        history: this.props.history,
      });
    });
  };

  onPrintPhysicalCount = () => {
    const form_data = {
      user: this.props.auth.user,
    };
    axios.post("/api/products/physical-count", form_data).then((response) => {
      message.success("Physical count printed");
    });
  };

  onPrintEnding = () => {
    const form_data = {
      user: this.props.auth.user,
    };
    axios.post("/api/products/ending", form_data).then((response) => {
      message.success("Ending Summary printed");
    });
  };

  onZread = () => {
    const form_data = {
      user: this.props.auth.user,
    };
    axios.post("/api/sales/zread", form_data).then((response) => {
      message.success("Zread printed");
    });
  };

  onXread = () => {
    const loading = message.loading("Processing...");
    const form_data = {
      user: this.props.auth.user,
    };
    axios
      .post("/api/sales/xread", form_data)
      .then((response) => {
        loading();
        message.success("Xread printed");
      })
      .catch((err) => {
        loading();
        message.error("There was a problem printing your xread");
      });
  };

  onLogout = () => {
    this.props.logoutUser();
    this.props.history.push("/login");
  };

  onAccountPayment = () => {
    this.accountPaymentForm.current.open((account_payment) => {},
    this.props.auth.user);
  };

  onSelectAccount = () => {
    this.selectAccountModal.current.open((account_payment) => {},
    this.props.auth.user);
  };

  onMergeTable = () => {
    this.props.history.push("/merge-table");
  };

  onAdminPanel = () => {
    this.props.history.push("/products");
  };

  onShowReprintConfirmation = () => {
    confirm({
      title: "Reprint Receipt",
      content: "Would you like to reprint latest receipt?",
      okText: "Reprint",
      cancelText: "No",
      onOk: () => {
        this.reprintLatestTransaction();
      },
      onCancel: () => {
        this.bookingReferenceModal.current.open((sales_id) => {
          this.reprintSale(sales_id);
        });
      },
    });
  };

  reprintSale = (sales_id) => {
    const loading = message.loading("Processing...");
    axios
      .post(`/api/sales/reprint/${sales_id}`)
      .then((response) => {
        loading();
        if (response.data) {
          message.success("Receipt Reprinted");
        } else {
          message.error("Receipt Reference not found");
        }
      })
      .catch((err) => {
        message.error("There was an error printing your receipt");
      });
  };

  reprintLatestTransaction = () => {
    const loading = message.loading("Processing...");
    axios.post("/api/sales/reprint/latest").then(() => {
      loading();
      message.success("Receipt Reprinted");
    });
  };

  onBack = () => {
    this.props.history.push("/billing");
  };

  render() {
    return (
      <div className="container-is-fullheight is-flex flex-column">
        <AccountPaymentForm ref={this.accountPaymentForm} />

        <InputModal
          title="Booking Reference"
          placeholder="Booking Reference"
          ref={this.bookingReferenceModal}
        />
        <div
          className="container box container-is-fullheight flex-1 full-width"
          style={{ marginTop: "1rem" }}
        >
          <Row>
            <Col span={24}>
              <div className="columns is-multiline">
                {this.state.tieups.map((tieup) => (
                  <div
                    onClick={() => this.onTieupSelect(tieup)}
                    key={tieup._id}
                    className="column TableNumber--table-number is-2 has-background-success"
                  >
                    {tieup.name}
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </div>
        <div className="container full-width" style={{ flex: 0 }}>
          <OptionButton
            label="Back"
            icon="fas fa-angle-left"
            onClick={this.onBack}
          />
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state) => {
  return {
    tables: state.tables,
    auth: state.auth,
    pos: state.pos,
  };
};

export default connect(mapStateToProps, {
  getTables,
  setTableTieup,
  logoutUser,
})(withRouter(SelectTieupForm));
