import React from "react";
// import logo from "./../images/logo.png";

export default function CheckVoucherHeading({
  title,
  has_logo = true,
  has_business_name = true,
  type_of_copy = null,
  branch,
}) {
  return (
    <div className="report-heading is-flex">
      {/* {has_logo && (
        <img
          src={logo}
          alt="logo"
          className="report-logo"
          style={{ width: "50px", verticalAlign: "top" }}
        />
      )} */}

      {has_business_name && (
        <div className="inline-block" style={{ paddingLeft: "0px" }}>
          <span className="has-text-weight-bold">
            {branch.company?.name} - {branch?.name}
          </span>{" "}
          <br />
          {branch?.address} <br />
          {/* TIN NO: {process.env.REACT_APP_TIN} <br /> */}
          <br />
        </div>
      )}

      {title && (
        <div className="flex-1 has-text-right">
          <div className="report-title ">{title}</div>
          <div>{type_of_copy}</div>
        </div>
      )}
    </div>
  );
}
