import React, { Component } from "react";
import classnames from "classnames";
import isEmpty from "./../validation/is-empty";
import "./../styles/TableNumbers.css";
import { connect } from "react-redux";
import { getTables } from "./../actions/tableActions";
import { setTable } from "./../actions/posActions";
import { logoutUser } from "./../actions/authActions";

import { withRouter } from "react-router-dom";
import socketIoClient from "socket.io-client";
import { SOCKET_ENDPOINT, USER_ADMIN, USER_OWNER } from "../utils/constants";
import DeveloperFooter from "../utils/DeveloperFooter";
import { Button, message, Modal } from "antd";
import axios from "axios";
import AccountPaymentForm from "./AccountPaymentForm";
import InputModal from "./InputModal";
import msalvio_logo from "./../images/msalvio-logo.png";

const { confirm } = Modal;

let socket = null;
class TableNumbers extends Component {
  state = {
    url: "/api/tables/",
    tables: [],
  };

  constructor(props) {
    super(props);
    this.salesInvoiceForm = React.createRef();
    this.selectAccountModal = React.createRef();
  }

  componentDidMount = () => {
    this.props.getTables();
    socket = socketIoClient(SOCKET_ENDPOINT);
    socket.on("refresh_table", (data) => {
      this.props.getTables();
    });
  };

  componentWillUnmount() {
    socket.close();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.tables !== this.props.tables) {
      this.setState({ tables: this.props.tables });
    }
  }

  hasZread = () => {
    return new Promise((resolve, reject) => {
      axios
        .post("/api/sales/has-zread", {})
        .then((response) => {
          resolve(response.data.status);
        })
        .catch((err) => reject(err));
    });
  };

  onTableSelect = (table) => {
    this.hasZread()
      .then((has_zread) => {
        if (has_zread) {
          message.error("Unable to make new orders. Zread already processed.");
        } else {
          this.props.setTable(table, this.props.history);
        }
      })
      .catch((err) => {
        console.log(err);
        console.log(
          "There was an error selecting the table, please contact your provider"
        );
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
        this.salesInvoiceForm.current.open((sales_id) => {
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

  render() {
    return (
      <div
        className="is-flex  
      is-full-height flex-direction-column pad-container overflow-auto"
      >
        <InputModal
          title="Sales Invoice Reference"
          placeholder="SI #"
          ref={this.salesInvoiceForm}
        />
        <div className="flex-1 is-flex overflow-auto">
          <div className=" flex-1">
            <div className="grid-wrapper overflow-auto">
              {this.state.tables.map((table) => (
                <div
                  onClick={() => this.onTableSelect(table)}
                  key={table._id}
                  className={classnames("TableNumber--table-number ", {
                    "has-background-success": isEmpty(table.orders),
                    "has-background-danger": !isEmpty(table.orders),
                  })}
                >
                  <div>{table.name}</div>
                  {!isEmpty(table?.customer?.name) && (
                    <div className="table-customer-name">
                      {table?.customer?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {this.props.auth && this.props.auth.isAuthenticated && (
            <div className="pad-l-1 is-flex flex-direction-column ">
              <div className="has-text-centered">
                Hello, <strong>{this.props.auth.user.name}</strong>
              </div>
              <Button
                className=" cashier-button"
                style={{ marginTop: "12px" }}
                onClick={this.onLogout}
              >
                Logout
              </Button>

              {[USER_ADMIN, USER_OWNER].includes(this.props.auth.user.role) && (
                <Button
                  className=" cashier-button"
                  style={{ marginTop: "12px" }}
                  onClick={this.onAdminPanel}
                >
                  ADMIN PANEL
                </Button>
              )}

              <Button
                className=" cashier-button"
                style={{ marginTop: "12px" }}
                onClick={this.onMergeTable}
              >
                MERGE TABLE
              </Button>

              <Button
                className=" cashier-button"
                style={{ marginTop: "12px" }}
                onClick={() => this.props.history.push("/cashier")}
              >
                CASHIERING
              </Button>
            </div>
          )}
        </div>
        {this.props.auth.isAuthenticated ? (
          <DeveloperFooter history={this.props.history} />
        ) : (
          <div className="has-text-centered">
            <img src={msalvio_logo} alt="logo" className="msalvio-logo" />
          </div>
        )}
      </div>
    );
  }
}
const mapStateToProps = (state) => {
  return {
    tables: state.tables,
    auth: state.auth,
  };
};

export default connect(mapStateToProps, { getTables, setTable, logoutUser })(
  withRouter(TableNumbers)
);
