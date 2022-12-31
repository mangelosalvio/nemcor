import React, { Component } from "react";
import "react-dates/initialize";
import { NavLink } from "react-router-dom";
import { DateRangePicker } from "react-dates";
import "react-dates/lib/css/_datepicker.css";
import "./../styles/Summary.css";
import { connect } from "react-redux";
import moment_tz from "moment-timezone";
import Navbar from "./Navbar";
import axios from "axios";
import numeral from "numeral";

class SalesInvoices extends Component {
  state = {
    startDate: null,
    enddDate: null,
    focusedInput: null,
    id_no: "",
    rows: []
  };

  onChange = e => {
    this.setState({ id_no: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();

    if (this.state.startDate && this.state.endDate) {
      axios
        .get(
          `/api/sales/invoices?startDate=${this.state.startDate
            .startOf("day")
            .valueOf()}&endDate=${this.state.endDate.endOf("day").valueOf()}`
        )
        .then(response => this.setState({ rows: response.data }))
        .catch(err => console.log(err));
    }
  };

  render() {
    return (
      <div>
        <div className="container">
          <div className="columns">
            <form
              className="column is-one-third DtrSummary-form-input"
              onSubmit={this.onSubmit}
            >
              <Navbar />

              <div>
                <h1 className="is-bold">Sales Invoices Report</h1>
                <hr />
              </div>

              <div className="field">
                <DateRangePicker
                  startDate={this.state.startDate}
                  endDate={this.state.endDate}
                  startDateId="start_date"
                  endDateId="end_date"
                  onDatesChange={({ startDate, endDate }) =>
                    this.setState({ startDate, endDate })
                  }
                  focusedInput={this.state.focusedInput}
                  onFocusChange={focusedInput =>
                    this.setState({ focusedInput })
                  }
                  isOutsideRange={() => false}
                />
              </div>

              <div className="field is-grouped">
                <p className="control">
                  <button className="button is-primary">Search</button>
                </p>
                <p className="control">
                  <NavLink to="/" className="button">
                    Back
                  </NavLink>
                </p>
              </div>
            </form>
            <div className="column">
              <table className="table is-fullwidth">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>TABLE</th>
                    <th className="has-text-right">AMOUNT DUE</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.rows.map(row => (
                    <tr key={row._id}>
                      <td>
                        {moment_tz(row.datetime)
                          .tz(process.env.TIMEZONE)
                          .format("llll")}
                      </td>
                      <td>{row.table.name}</td>
                      <td className="has-text-right">
                        {numeral(row.summary.amount_due).format("0,0.00")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    auth: state.auth
  };
};

export default connect(mapStateToProps)(SalesInvoices);
