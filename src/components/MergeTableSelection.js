import React, { Component } from "react";
import classnames from "classnames";
import isEmpty from "./../validation/is-empty";
import "./../styles/TableNumbers.css";
import { connect } from "react-redux";
import { getTables } from "./../actions/tableActions";
import { transferTable } from "./../actions/posActions";
import OptionButton from "../commons/OptionButton";
import { Row, Col, message } from "antd";
import axios from "axios";
import socketIoClient from "socket.io-client";
import { SOCKET_ENDPOINT } from "../utils/constants";

let socket;
class MergeTableSelection extends Component {
  state = {
    url: "/api/tables/",
    tables: [],
  };

  componentDidMount = () => {
    socket = socketIoClient(SOCKET_ENDPOINT);
    /* if (isEmpty(this.props.pos.table)) {
      this.props.history("/cashier-tables");
    } */

    this.props.getTables();
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (prevProps.tables !== this.props.tables) {
      this.setState({ tables: this.props.tables });
    }
  };

  onTableSelect = (table) => {
    let tables = [...this.state.tables];
    const index = this.state.tables.indexOf(table);

    const is_selected = table.is_selected ? false : true;

    tables[index] = {
      ...table,
      is_selected,
    };

    this.setState({
      tables,
    });
  };

  onMerge = (table) => {
    const from_tables = [...this.state.tables].filter(
      (table) => table.is_selected
    );

    const to_table = { ...table };

    const form_data = {
      from_tables,
      to_table,
    };

    const loading = message.loading("Processing");
    axios.post("/api/tables/merge", form_data).then((response) => {
      loading();
      socket.emit("refresh_table", true);
      this.props.history.push("/cashier-tables");
    });
  };

  onBack = () => {
    this.props.history.push("/order");
  };

  render() {
    return (
      <div className="container-is-fullheight is-flex flex-column">
        <div
          className="container box container-is-fullheight flex-1 full-width"
          style={{ marginTop: "1rem" }}
        >
          <Row>
            <Col span={12}>
              <div className="has-text-centered is-size-5">
                <div className="module-heading">TABLE SELECTION</div>
                <hr />
              </div>
              <div className="columns is-multiline">
                {this.state.tables
                  .filter((table) => !isEmpty(table.orders))
                  .map((table, index) => (
                    <div
                      onClick={() => this.onTableSelect(table)}
                      key={table._id}
                      className={classnames(
                        "table-selection column TableNumber--table-number is-2",
                        {
                          "is-selected": table.is_selected,
                        }
                      )}
                    >
                      {table.name}
                    </div>
                  ))}
              </div>
            </Col>
            <Col span={12}>
              <div className="has-text-centered is-size-5">
                <div className="module-heading">MERGE TO</div>
                <hr />
                <div className="columns is-multiline">
                  {this.state.tables
                    .filter((table) => !isEmpty(table.orders))
                    .filter((table) => !table.is_selected)
                    .map((table) => (
                      <div
                        onClick={() => this.onMerge(table)}
                        key={table._id}
                        className={classnames(
                          "table-selection column TableNumber--table-number is-2",
                          {}
                        )}
                      >
                        {table.name}
                      </div>
                    ))}
                </div>
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
    pos: state.pos,
  };
};

export default connect(mapStateToProps, { getTables, transferTable })(
  MergeTableSelection
);
