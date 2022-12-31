import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { clearChange } from "./../actions/posActions";
import numeral from "numeral";

class Change extends Component {
  onBack = () => {
    this.props.clearChange(this.props.history);
  };

  render() {
    return (
      <div className="container">
        <div className="columns">
          <div className="column is-6 is-offset-3 flex">
            <div className="has-text-centered">
              <span style={{ fontSize: "2rem" }}>Change</span>
            </div>
            <div className="has-text-centered">
              <span style={{ fontSize: "10rem", fontWeight: "bold" }}>
                {numeral(this.props.pos.change).format("0,0.00")}
              </span>
            </div>
            <div className="columns">
              <button
                onClick={this.onBack}
                className="button flex-1 has-background-primary"
                style={{ height: "50px" }}
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
const mapStateToProps = state => {
  return {
    pos: state.pos
  };
};

export default connect(
  mapStateToProps,
  { clearChange }
)(withRouter(Change));
