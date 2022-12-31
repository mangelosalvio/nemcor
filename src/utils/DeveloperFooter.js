import React from "react";

const DeveloperFooter = ({ style, history }) => (
  <div
    className="has-text-centered DeveloperFooter"
    style={style}
    onClick={() => history && history.push("/")}
  >
    <div
      className="tooltip"
      data-tooltip="Developer : Michael Salvio ; msalvio.technologies@gmail.com"
      style={{ display: "inline-block", textAlign: "left" }}
    >
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        powered by{" "}
        <span className="has-text-weight-bold">
          msalvio software & hardware technologies
        </span>
      </div>
    </div>
  </div>
);

export default DeveloperFooter;
