import React, { Component } from "react";
import classnames from "classnames";
import isEmpty from "./../validation/is-empty";
import "./../styles/TableNumbers.css";
import { connect } from "react-redux";
import { getTables } from "./../actions/tableActions";
import { transferTable } from "./../actions/posActions";

import Navbar from "./Navbar";
import OptionButton from "../commons/OptionButton";

class SelectTable extends Component {
  state = {
    url: "/api/tables/",
    tables: []
  };

  componentDidMount = () => {
    if (isEmpty(this.props.pos.table)) {
      this.props.history("/cashier-tables");
    }

    this.props.getTables();
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.tables !== this.props.tables) {
      this.setState({ tables: this.props.tables });
    }
  }

  onTableSelect = newTable => {
    this.props.transferTable(this.props.pos.table, newTable);
    this.props.history.push("/order");
  };

  onBack = () => {
    this.props.history.push("/order");
  };

  render() {
    return (
      <div className="container-is-fullheight is-flex flex-column">
        <div
          className="container box container-is-fullheight flex-1"
          style={{ marginTop: "1rem" }}
        >
          <div className="has-text-centered is-size-3">
            Select table to transfer
            <hr />
          </div>
          <div className="columns is-multiline">
            {this.state.tables
              .filter(table => isEmpty(table.orders))
              .map(table => (
                <div
                  onClick={() => this.onTableSelect(table)}
                  key={table._id}
                  className={classnames(
                    "column TableNumber--table-number is-1",
                    {
                      "has-background-success": isEmpty(table.orders),
                      "has-background-danger": !isEmpty(table.orders)
                    }
                  )}
                >
                  {table.name}
                </div>
              ))}
          </div>
        </div>
        <div className="container">
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
const mapStateToProps = state => {
  return {
    tables: state.tables,
    pos: state.pos
  };
};

export default connect(mapStateToProps, { getTables, transferTable })(
  SelectTable
);
