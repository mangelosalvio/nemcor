import React, { Component } from "react";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "./../styles/Summary.css";
import { connect } from "react-redux";
import Navbar from "./Navbar";
import axios from "axios";
import numeral from "numeral";

class SalesSummary extends Component {
  state = {
    startDate: null,
    enddDate: null,
    focusedInput: null,
    id_no: "",
    records: []
  };

  componentDidMount = () => {
    axios
      .get("/api/raw-ins/summary")
      .then(response => {
        this.setState({
          records: response.data
        });
      })
      .catch(err => console.log(err));
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
        .then(response => this.setState({ records: response.data }))
        .catch(err => console.log(err));
    }
  };

  render() {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="columns">
            <div className="column">
              <table className="table is-fullwidth">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th className="has-text-right">QUANTITY</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.records.map((record, i) => (
                    <tr key={i}>
                      <td>{record.name}</td>
                      <td className="has-text-right">
                        {numeral(record.quantity).format("0,0.00")}
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

export default connect(mapStateToProps)(SalesSummary);
