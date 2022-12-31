import React, { Component } from "react";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "./../styles/Summary.css";
import { connect } from "react-redux";
import Navbar from "./Navbar";
import axios from "axios";
import numberFormat from "./../utils/numberFormat";

class Inventory extends Component {
  state = {
    startDate: null,
    enddDate: null,
    focusedInput: null,
    id_no: "",
    records: []
  };

  componentDidMount = () => {
    axios
      .get("/api/products/inventory")
      .then(response => {
        let raw_materials = response.data.raw_materials;

        let inventory = raw_materials.reduce((accumulator, raw_material) => {
          const obj = {};
          obj["name"] = raw_material.name;
          obj["in"] = 0;
          obj["out"] = 0;
          obj["orders"] = 0;
          /**
           * IN
           */
          const matching_raw_mats = response.data.raw_ins.find(record => {
            return record.name === raw_material.name;
          });

          if (matching_raw_mats) {
            obj["in"] = matching_raw_mats.quantity;
          }

          /**
           * OUT
           */
          const consumed_raw_mats = response.data.sales.find(record => {
            return record.name === raw_material.name;
          });

          if (consumed_raw_mats) {
            obj["out"] = consumed_raw_mats.quantity;
          }

          /**
           * ORDERS
           */
          const ordered_raw_mats = response.data.orders.find(record => {
            return record.name === raw_material.name;
          });

          if (ordered_raw_mats) {
            obj["orders"] = ordered_raw_mats.quantity;
          }

          const acc = [...accumulator, obj];
          return acc;
        }, {});

        inventory = inventory.filter(o => {
          return o.in !== 0 || o.out !== 0;
        });

        console.log(inventory);

        this.setState({ records: inventory });
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
                    <th className="has-text-right">IN</th>
                    <th className="has-text-right">OUT</th>
                    <th className="has-text-right">ORDERS</th>
                    <th className="has-text-right">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.records.map((record, i) => (
                    <tr key={i}>
                      <td>{record.name}</td>
                      <td className="has-text-right">
                        {numberFormat(record.in)}
                      </td>
                      <td className="has-text-right">
                        {numberFormat(record.out)}
                      </td>
                      <td className="has-text-right">
                        {numberFormat(record.orders)}
                      </td>
                      <td className="has-text-right">
                        {numberFormat(record.in - record.out - record.orders)}
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

export default connect(mapStateToProps)(Inventory);
