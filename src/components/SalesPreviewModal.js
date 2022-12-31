import React, { Component } from "react";
import { Modal, message, Row, Col, Divider } from "antd";
import axios from "axios";

import moment from "moment";
import numberFormat from "./../utils/numberFormat";
import round from "../utils/round";

export default class SalesPreviewModal extends Component {
  state = {
    sale: {
      items: [],
    },
    visible: false,
    errors: {},
  };

  open = (sale) => {
    this.setState({ visible: true }, () => {
      this.getSale(sale);
    });
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    this.setState({
      visible: false,
    });
  };

  getSale = (sale) => {
    const loading = message.loading("Loading...");

    let sales_url;
    if (this.props.other_set) {
      sales_url = `/api/sales/${sale._id}/other-set`;
    } else {
      sales_url = `/api/sales/${sale._id}`;
    }

    axios.get(sales_url).then((response) => {
      const sale = response.data;
      this.setState({
        sale,
      });
      loading();
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Sales Preview"
          visible={this.state.visible}
          onOk={this.onSubmit}
          onCancel={() => this.setState({ visible: false })}
          centered={true}
        >
          <div>
            <Row>
              <Col className="has-text-centered has-text-weight-bold">
                {process.env.REACT_APP_TRADE_NAME}
              </Col>
              <div></div>
            </Row>
            <div className="m-t-1">
              SI#
              <span className="has-text-weight-bold">
                {this.state.sale.sales_id}
              </span>{" "}
              / {moment(this.state.sale.datetime).format("lll")}
            </div>
            <div>
              CASHIER: {this.state.sale.user && this.state.sale.user.name}
            </div>
            {this.state?.sale?.tieup_information?.tieup && [
              <div key="tieup-name">
                TIE-UP: {this.state.sale?.tieup_information?.tieup.name}
              </div>,
              <div key="tieup-booking-reference">
                BOOKING REFERENCE:{" "}
                {this.state.sale?.tieup_information?.booking_reference}
              </div>,
            ]}
            <Divider />
            {this.state.sale.items.map((item, index) => (
              <Row key={index}>
                <Col span={4}>{item.quantity}</Col>
                <Col span={16}>
                  <div>
                    <span className="has-text-weight-bold">
                      {item.product.name}
                    </span>{" "}
                    <br />@{numberFormat(item.product.price)}
                  </div>
                </Col>
                <Col span={4} className="has-text-right">
                  {numberFormat(item.gross_amount)}
                </Col>
              </Row>
            ))}
            <Divider />
            <Row>
              <Col span={4}>SUBTOTAL</Col>
              <Col span={20} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.subtotal)}
              </Col>
            </Row>
            {this.state.sale.summary && this.state.sale.summary.less_vat > 0 && (
              <Row>
                <Col offset={2} span={10}>
                  LESS VAT DEDUCTION
                </Col>
                <Col span={12} className="has-text-right">
                  {numberFormat(0 - this.state.sale.summary.less_vat)}
                </Col>
              </Row>
            )}
            {this.state.sale.summary &&
              this.state.sale.summary.less_sc_disc > 0 && (
                <Row>
                  <Col offset={2} span={10}>
                    LESS SC DISC
                  </Col>
                  <Col span={12} className="has-text-right">
                    {numberFormat(0 - this.state.sale.summary.less_sc_disc)}
                  </Col>
                </Row>
              )}
            {this.state.sale.summary &&
              this.state.sale.summary.discount_amount > 0 && (
                <Row>
                  <Col offset={2} span={10}>
                    LESS DISC
                  </Col>
                  <Col span={12} className="has-text-right">
                    {numberFormat(0 - this.state.sale.summary.discount_amount)}
                  </Col>
                </Row>
              )}
            <Row>
              <Col span={20}>TOTAL</Col>
              <Col
                span={4}
                className="has-text-right b-t-3 has-text-weight-bold"
              >
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.net_amount)}
              </Col>
            </Row>
            {this.state.sale.payments &&
              this.state.sale.payments.credit_cards &&
              this.state.sale.payments.credit_cards.length > 0 && [
                <Divider key="divider" />,
                this.state.sale.payments &&
                  this.state.sale.payments.credit_cards.map((o, index) => (
                    <Row key={index}>
                      <Col span={20}>
                        {o.credit_card.card} /{" "}
                        {o.credit_card.card_number.substring(
                          o.credit_card.card_number.length - 4
                        )}
                      </Col>
                      <Col span={4} className="has-text-right">
                        {numberFormat(0 - o.credit_card.amount)}
                      </Col>
                    </Row>
                  )),
              ]}
            {this.state.sale.payments &&
              this.state.sale.payments.checks.map((o, index) => (
                <Row key={index}>
                  <Col span={20}>
                    CK:{o.bank}/{o.check_no}
                  </Col>
                  <Col span={4} className="has-text-right">
                    {numberFormat(0 - o.amount)}
                  </Col>
                </Row>
              ))}

            {(this.state.sale?.payments?.free_of_charge_payments || []).map(
              (o, index) => (
                <Row key={index}>
                  <Col span={20}>
                    F.O.C.:{o.name}/{o.remarks}
                  </Col>
                  <Col span={4} className="has-text-right">
                    {numberFormat(0 - o.amount)}
                  </Col>
                </Row>
              )
            )}
            {(this.state.sale?.payments?.online_payments || []).map(
              (o, index) => (
                <Row key={index}>
                  <Col span={20}>
                    Online:{o.depository}/{o.reference}
                  </Col>
                  <Col span={4} className="has-text-right">
                    {numberFormat(0 - o.amount)}
                  </Col>
                </Row>
              )
            )}
            {(this.state.sale?.payments?.charge_to_accounts || []).map(
              (o, index) => (
                <Row key={index}>
                  <Col span={20}>Charge: {o.account.name}</Col>
                  <Col span={4} className="has-text-right">
                    {numberFormat(0 - o.amount)}
                  </Col>
                </Row>
              )
            )}
            {(this.state.sale?.payments?.gift_checks || []).map((o, index) => (
              <Row key={index}>
                <Col span={20}>GC:{o.gift_check.items.gift_check_number}</Col>
                <Col span={4} className="has-text-right">
                  {numberFormat(0 - o.amount)}
                </Col>
              </Row>
            ))}

            <Divider />
            <Row>
              <Col span={20}>
                <div>AMOUNT DUE</div>
              </Col>
              <Col span={4} className="has-text-right b-t-3">
                {this.state.sale.summary &&
                  numberFormat(round(this.state.sale.summary.amount_due))}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>CASH TENDERED</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.payment_amount)}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>CHANGE DUE</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.change)}
              </Col>
            </Row>
            <Divider />
            <Row>
              <Col span={20}>
                <div>VAT SALES</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.vatable_amount)}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>VAT</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.vat_amount)}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>VAT EXEMPT SALES</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.vat_exempt_amount)}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>NON VAT SALES</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.non_vatable_amount)}
              </Col>
            </Row>
            <Row>
              <Col span={20}>
                <div>ZERO-RATED SALES</div>
              </Col>
              <Col span={4} className="has-text-right">
                {this.state.sale.summary &&
                  numberFormat(this.state.sale.summary.zero_rated_amount)}
              </Col>
            </Row>
            {this.state.sale.seniors &&
              this.state.sale.seniors.length > 0 && [
                <Divider key="divider" />,
                <div key="sc-details">SC/PWD DISCOUNT DETAILS</div>,

                this.state.sale.seniors.map((senior, index) => (
                  <Row key={index}>
                    <Col span={16}>
                      [SC/PWD] {senior.name}
                      {senior.no}
                    </Col>
                  </Row>
                )),
              ]}
          </div>
        </Modal>
      </div>
    );
  }
}
