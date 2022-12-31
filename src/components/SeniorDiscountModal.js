import React, { Component } from "react";
import { Input, Modal, message, Table, Divider } from "antd";
import isEmpty from "../validation/is-empty";
import { addKeysToArray } from "./utils/utilities";

let callback;
export default class SeniorDiscountModal extends Component {
  state = {
    input: "",
    visible: false,
    items: [],
    selected_item_index: 0,
    no_of_persons: null,
  };

  constructor(props) {
    super(props);
    this.input_field = React.createRef();
  }

  open = (c) => {
    this.setState({ visible: true }, () => {
      setTimeout(() => {
        if (this.input_field.current) {
          this.input_field.current.focus();
        }
      }, 300);
    });

    callback = c;
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onKeyDown = (e) => {
    if (e.key === "Escape") {
      this.setState({
        visible: false,
        input: "",
      });
      callback({
        seniors: [],
        no_of_persons: 1,
      });
    } else if (e.key === "ArrowUp") {
      this.onArrowUp();
    } else if (e.key === "ArrowDown") {
      this.onArrowDown();
    } else if (e.key === "F4") {
      this.onDeleteSenior(this.state.selected_item_index);
    }
  };

  onArrowUp = () => {
    let value = this.state.selected_item_index - 1;
    value = value < 0 ? 0 : value;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `senior-item-row-${this.state.selected_item_index}`
        )[0];
        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    );
  };

  onArrowDown = () => {
    let value = this.state.selected_item_index + 1;
    value =
      value > this.state.items.length - 1 ? this.state.items.length - 1 : value;

    this.setState(
      {
        selected_item_index: value,
      },
      () => {
        const el = document.getElementsByClassName(
          `senior-item-row-${this.state.selected_item_index}`
        )[0];

        if (el) {
          el.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
    );
  };

  onSelectProduct = () => {
    if (this.state.items.length > 0) {
      this.setState({
        input: "",
        visible: false,
      });
      this.props.onSearchProductSelect({
        item: this.state.items[this.state.selected_item_index],
      });
    }
  };

  onEnterSenior = () => {
    if (isEmpty(this.state.input)) {
      message.error("Please enter Senior/PWD Details");
      return;
    }

    const arr = this.state.input.split("/");
    const no = arr[0] || "";
    const name = arr[1] || "";
    const tin = arr[2] || "";

    if (isEmpty(no)) {
      message.error("Please supply senior/PWD number");
      return;
    }

    if (isEmpty(name)) {
      message.error("Please supply senior/PWD name");
      return;
    }

    let items = [
      ...this.state.items,
      {
        no,
        name,
        tin,
      },
    ];

    this.setState({ items, input: "" });
  };

  applySeniorDiscount = () => {
    if (isEmpty(this.state.no_of_persons)) {
      message.error("Enter # of of Persons");
      return;
    }

    if (this.state.no_of_persons < this.state.items.length) {
      message.error("No. of persons should be greater than No. of seniors/PWD");
      return;
    }

    callback({
      seniors: this.state.items,
      no_of_persons: this.state.no_of_persons,
    });

    this.setState({
      input: "",
      no_of_persons: "",
      items: [],
      visible: false,
    });
  };

  onDeleteSenior = (index) => {
    const items = [...this.state.items];
    items.splice(index, 1);

    this.setState({
      items,
    });
    if (this.input_field.current) {
      this.input_field.current.focus();
    }
  };

  render() {
    const records_column = [
      {
        title: "",
        key: "delete-item",
        width: 50,
        render: (value, record, index) => (
          <span>
            <i
              class="fa-solid fa-trash"
              onClick={() => {
                const items = [...this.state.items];
                items.splice(index, 1);

                this.setState({
                  items,
                });
                if (this.input_field.current) {
                  this.input_field.current.focus();
                }
              }}
            ></i>
          </span>
        ),
      },
      {
        title: "OSACA/PWD NO",
        dataIndex: "no",
      },
      {
        title: "SENIOR/PWD NAME",
        dataIndex: "name",
      },
      {
        title: "TIN",
        dataIndex: "tin",
      },
    ];

    return (
      <Modal
        title="Senior Discount"
        visible={this.state.visible}
        width={700}
        onCancel={() => {
          this.setState({ visible: false });
          this.props.onCancel();
        }}
        onOk={() => {
          this.applySeniorDiscount();
        }}
      >
        <div>
          <Input
            name="input"
            placeholder={this.props.placeholder}
            value={this.state.input}
            onChange={this.onChange}
            autoFocus={true}
            ref={this.input_field}
            autoComplete="off"
            onPressEnter={this.onEnterSenior}
            onKeyDown={this.onKeyDown}
          />
          <Divider />
          <Table
            dataSource={addKeysToArray([...this.state.items])}
            columns={records_column}
            scroll={{ y: 351 }}
            pagination={false}
            rowClassName={(record, index) => {
              if (this.state.selected_item_index === index) {
                return `is-senior-item-selected senior-item-row-${index}`;
              }
              return `senior-item-row-${index}`;
            }}
          />
          <Divider />
          Total # of Persons
          <Input
            type="number"
            name="no_of_persons"
            value={this.state.no_of_persons}
            onChange={this.onChange}
            autoComplete="off"
            onPressEnter={() => this.applySeniorDiscount()}
          />
        </div>
      </Modal>
    );
  }
}
