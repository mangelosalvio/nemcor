import React from "react";

export default ({ label }) => {
  return (
    <div>
      <span className="is-size-5 has-text-weight-bold">{label}</span>
      <hr
        style={{
          marginTop: "0",
          marginBottom: "1.5rem"
        }}
      />
    </div>
  );
};
