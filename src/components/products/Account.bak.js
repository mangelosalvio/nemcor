import React, { Component } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Navbar from "../Navbar";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import MessageBoxInfo from "../../commons/MessageBoxInfo";
import Searchbar from "../../commons/Searchbar";
import Autosuggest from "react-autosuggest";
import classnames from "classnames";
import "../../styles/Autosuggest.css";
import Divider from "../../commons/Divider";
import AutoSuggestFieldGroup from "../../commons/AutoSuggestFieldGroup";
import numberFormat from "./../../utils/numberFormat";
import { sumBy } from "lodash";
import moment from "moment";

const collection_name = "products";

const form_data = {
  title: "Accounts",
  url: "/api/accounts/",
  search_keyword: "",
  errors: {},
  [collection_name]: [],

  _id: "",
  name: "",
  company_name: "",
  ledger: []
};

class Account extends Component {
  state = {
    ...form_data
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = e => {
    e.preventDefault();

    const form_data = {
      ...this.state
    };

    if (isEmpty(this.state._id)) {
      axios
        .put(this.state.url, form_data)
        .then(({ data }) =>
          this.setState({
            ...data,
            errors: {},
            message: "Transaction Saved"
          })
        )
        .catch(err => this.setState({ errors: err.response.data }));
    } else {
      axios
        .post(this.state.url + this.state._id, form_data)
        .then(({ data }) =>
          this.setState({
            ...data,
            errors: {},
            message: "Transaction Updated"
          })
        )
        .catch(err => this.setState({ errors: err.response.data }));
    }
  };

  onSearch = e => {
    e.preventDefault();

    axios
      .get(this.state.url + "?s=" + this.state.search_keyword)
      .then(response =>
        this.setState({
          [collection_name]: response.data,
          message: isEmpty(response.data) ? "No rows found" : ""
        })
      )
      .catch(err => console.log(err));
  };

  addNew = () => {
    this.setState(
      {
        ...form_data
      },
      () => {
        this.name_input.focus();
      }
    );
  };

  edit = record => {
    axios
      .get(this.state.url + record._id)
      .then(response => {
        this.setState({
          [collection_name]: [],
          ...response.data
        });
      })
      .catch(err => console.log(err));
  };

  onDelete = () => {
    axios
      .delete(this.state.url + this.state._id)
      .then(response => {
        this.setState({
          ...form_data,
          message: "Transaction Deleted"
        });
      })
      .catch(err => console.log(err));
  };

  onHide = () => {
    this.setState({ message: "" });
  };

  render() {
    const { errors } = this.state;

    return (
      <div>
        <Navbar />

        <Searchbar
          name="search_keyword"
          onSearch={this.onSearch}
          onChange={this.onChange}
          value={this.state.search_keyword}
        />

        <div className="container box" style={{ marginTop: "1rem" }}>
          <span className="is-size-5">{this.state.title}</span>{" "}
          <button className="button is-small" onClick={this.addNew}>
            Add New
          </button>
          <hr />
          <MessageBoxInfo message={this.state.message} onHide={this.onHide} />
          {isEmpty(this.state.products) ? (
            <form onSubmit={this.onSubmit}>
              <div>
                <TextFieldGroup
                  label="Name"
                  name="name"
                  value={this.state.name}
                  onChange={this.onChange}
                  error={errors.name}
                  inputRef={input => (this.name_input = input)}
                />

                <TextFieldGroup
                  label="Company Name"
                  name="company_name"
                  value={this.state.company_name}
                  onChange={this.onChange}
                  error={errors.company_name}
                  inputRef={input => (this.company_name_input = input)}
                />

                <div className="field">
                  <table className="table full-width">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Particulars</th>
                        <th className="has-text-right">Debit</th>
                        <th className="has-text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.state.ledger.map(row => (
                        <tr>
                          <td>{moment(row.date).format("ll")}</td>
                          <td>{row.particulars}</td>
                          <td className="has-text-right">
                            {numberFormat(row.debit)}
                          </td>
                          <td className="has-text-right">
                            {numberFormat(row.credit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="buttons field is-grouped">
                  <div className="control">
                    <button className="button is-primary">Save</button>
                  </div>

                  {!isEmpty(this.state._id) ? (
                    <a
                      className="button is-danger is-outlined"
                      onClick={this.onDelete}
                    >
                      <span>Delete</span>
                      <span className="icon is-small">
                        <i className="fas fa-times" />
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </form>
          ) : (
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Accoount Name</th>
                  <th>Company Name</th>
                </tr>
              </thead>
              <tbody>
                {this.state[collection_name].map((record, index) => (
                  <tr key={record._id} onClick={() => this.edit(record)}>
                    <td>{index + 1}</td>
                    <td>{record.name}</td>
                    <td>{record.company_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }
}

export default Account;
