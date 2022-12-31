import React, { Component } from "react";
import { Modal, Col, Row, Divider } from "antd";
import axios from "axios";
import classnames from "classnames";
import TextFieldGroup from "../commons/TextFieldGroup";
import { formItemLayout } from "../utils/Layouts";

let callback;
export default class SelectTieupModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
    tieups: [],
    tieup: null,
    booking_reference: null,
  };

  constructor(props) {
    super(props);
    this.booking_reference_field = React.createRef();
  }

  onChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    this.setState({ [e.target.name]: value });
  };

  open = (c) => {
    axios
      .get("/api/tieups")
      .then((response) => {
        this.setState({ visible: true }, () => {
          this.setState({ tieups: response.data });
        });
      })
      .catch((err) => console.log(err));

    callback = c;
  };

  onSelect = (record) => {
    this.setState({ tieup: record });
    this.booking_reference_field.current.focus();
  };

  onEnter = () => {
    callback({
      tieup: this.state.tieup,
      booking_reference: this.state.booking_reference,
    });

    this.setState({
      tieups: [],
      tieup: null,
      booking_reference: null,
      visible: false,
    });
  };

  render() {
    return (
      <div>
        <Modal
          title="Select Tieup"
          visible={this.state.visible}
          footer={null}
          width={1024}
          onCancel={() => {
            this.setState({ visible: false });
            if (typeof this.props.onCancel === "function") {
              this.props.onCancel();
            }
          }}
        >
          <div>
            <Row>
              <Col>
                <div className="is-flex flex-wrap">
                  {this.state.tieups.map((record) => (
                    <div
                      onClick={() => this.onSelect(record)}
                      key={record._id}
                      className={classnames(
                        "waiter-container  has-background-success has-text-weight-bold",
                        {
                          "is-selected": record.name === this.state.tieup?.name,
                        }
                      )}
                    >
                      {record.name}
                    </div>
                  ))}
                </div>
              </Col>
              <Divider />
              <Col span={24}>
                <TextFieldGroup
                  label="Booking Reference"
                  name="booking_reference"
                  value={this.state.booking_reference}
                  onChange={this.onChange}
                  inputRef={this.booking_reference_field}
                  formItemLayout={formItemLayout}
                  onPressEnter={() => this.onEnter()}
                />
              </Col>
            </Row>
          </div>
        </Modal>
      </div>
    );
  }
}
