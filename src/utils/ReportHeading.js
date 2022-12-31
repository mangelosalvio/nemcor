import { Col, Row } from "antd";
import React from "react";
import logo from "./../images/delicioso-logo.jpg";

export default function ReportHeading({ title }) {
  return (
    <Row>
      <Col span={8}>
        {/* <div className="inline-block">
          <span className="has-text-weight-bold">
            {process.env.REACT_APP_COMPANY_NAME.toUpperCase()}
          </span>{" "}
          <br />
          {process.env.REACT_APP_COMPANY_ADDRESS} <br />
          <br />
        </div> */}
      </Col>
      <Col span={8} className="has-text-centered">
        {title && <div className="report-title">{title.toUpperCase()}</div>}{" "}
      </Col>
    </Row>
  );
}
