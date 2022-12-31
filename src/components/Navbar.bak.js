import React, { Component } from "react";
import { connect } from "react-redux";
import { logoutUser } from "../actions/authActions";
import { Link } from "react-router-dom";

class Navbar extends Component {
  onLogout = () => {
    this.props.logoutUser();
  };

  render() {
    const { user } = this.props.auth;

    return (
      <nav className="navbar is-fixed-top" aria-label="dropdown">
        <div className="navbar-brand">
          <a className="navbar-item">
            <span className="is-size-5 has-text-success is-bold">
              365 Modern Cafe
            </span>
          </a>
          <div
            className="navbar-burger burger"
            data-target="navbarExampleTransparentExample"
          >
            <span />
            <span />
          </div>
        </div>
        <div className="navbar-menu">
          <div className="navbar-start">
            <div className="navbar-item has-dropdown is-hoverable">
              <a className="navbar-link">Masterfiles</a>
              <div className="navbar-dropdown is-boxed">
                <Link className="navbar-item" to="/products">
                  Products
                </Link>
                <Link className="navbar-item" to="/categories">
                  Categories
                </Link>
                <Link className="navbar-item" to="/tables">
                  Tables
                </Link>
                <Link className="navbar-item" to="/accounts">
                  Accounts
                </Link>
                <Link className="navbar-item" to="/account-payments">
                  Account Payments
                </Link>
                <Link className="navbar-item" to="/gift-checks">
                  Gift Checks
                </Link>
              </div>
            </div>
            <Link className="navbar-item" to="/raw-ins">
              Raw Mats In
            </Link>
            <Link className="navbar-item" to="/cashier-tables">
              Cashier
            </Link>
            <div className="navbar-item has-dropdown is-hoverable">
              <a className="navbar-link">Reports</a>
              <div className="navbar-dropdown is-boxed">
                <Link className="navbar-item" to="/sales-invoices">
                  Sales Invoices
                </Link>
                <Link className="navbar-item" to="/sales-summary">
                  Sales Summary
                </Link>

                <Link className="navbar-item" to="/raw-ins-summary">
                  Raw Ins Summary
                </Link>

                <Link className="navbar-item" to="/raw-items-consumed">
                  Raw Items Consumed
                </Link>

                <Link className="navbar-item" to="/inventory">
                  Inventory Summary
                </Link>
              </div>
            </div>
          </div>

          <div className="navbar-end">
            <div className="navbar-item has-dropdown is-hoverable">
              <a className="navbar-link">{user.name}</a>

              <div className="navbar-dropdown is-right">
                <a className="navbar-item">Settings</a>
                <hr className="navbar-divider" />
                <a onClick={this.onLogout} className="navbar-item">
                  Logout
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }
}

const mapStateToProps = state => {
  return {
    auth: state.auth
  };
};

export default connect(
  mapStateToProps,
  { logoutUser }
)(Navbar);
