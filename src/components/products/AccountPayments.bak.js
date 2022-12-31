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

const collection_name = "account_payments";

const form_data = {
  title: "Account Payments",
  url: "/api/account-payments/",
  search_keyword: "",
  errors: {},
  [collection_name]: [],

  _id: "",
  account: "",
  amount: Number,
  particulars: "",
  date: "",

  account_suggestion_name: "",
  account_suggestions: []
};

class AccountPayments extends Component {
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
        this.account_input.input.focus();
      }
    );
  };

  edit = record => {
    axios
      .get(this.state.url + record._id)
      .then(response => {
        this.setState({
          [collection_name]: [],
          ...response.data,
          account_suggestion_name: response.data.account.name
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

  /**
   * ACCOUNT AUTOSUGGEST
   */

  onAccountSuggestChange = (event, { newValue, method }) => {
    this.setState({ [event.target.name]: newValue });
  };

  onAccountsSuggestionsFetchRequested = ({ value }) => {
    axios
      .get("/api/accounts/?s=" + value)
      .then(response =>
        this.setState({ ["account_suggestions"]: response.data })
      )
      .catch(err => console.log(err));
  };

  onAccountsSuggestionsClearRequested = () => {
    this.setState({ ["account_suggestions"]: [] });
  };

  onAccountsRenderSuggestion = suggestion => <div>{suggestion.name}</div>;

  onAccountsSuggestionSelected = (event, { suggestion }) => {
    event.preventDefault();
    this.setState({
      account: suggestion,
      account_suggestion_name: suggestion.name
    });
  };

  onAccountsGetSuggestionValue = suggestion => suggestion.name;

  /**
   * END ACCOUNT AUTOSUGGEST
   */

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
          {isEmpty(this.state[collection_name]) ? (
            <form onSubmit={this.onSubmit}>
              <div className="field">
                {this.state.date && moment(this.state.date).format("ll")}
              </div>
              <div>
                <AutoSuggestFieldGroup
                  label="Account"
                  suggestions={this.state.account_suggestions}
                  onSuggestionsFetchRequested={
                    this.onAccountsSuggestionsFetchRequested
                  }
                  onSuggestionsClearRequested={
                    this.onAccountsSuggestionsClearRequested
                  }
                  onSuggestionSelected={this.onAccountsSuggestionSelected}
                  getSuggestionValue={this.onAccountsGetSuggestionValue}
                  renderSuggestion={this.onAccountsRenderSuggestion}
                  inputRef={autosuggest => (this.account_input = autosuggest)}
                  inputProps={{
                    placeholder: "Type Account Name",
                    name: "account_suggestion_name",
                    className: "input",
                    onChange: this.onAccountSuggestChange,
                    value: this.state.account_suggestion_name,
                    disabled: isEmpty(this.state._id) ? false : true
                  }}
                />

                <TextFieldGroup
                  label="Particulars"
                  name="particulars"
                  value={this.state.particulars}
                  onChange={this.onChange}
                  error={errors.particulars}
                  inputRef={input => (this.particulars_input = input)}
                />

                <TextFieldGroup
                  type="number"
                  label="Amount"
                  name="amount"
                  value={this.state.amount}
                  onChange={this.onChange}
                  error={errors.amount}
                  inputRef={input => (this.amount_input = input)}
                />

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
                  <th>Date</th>
                  <th>Account Name</th>
                  <th>Particulars</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {this.state[collection_name].map((record, index) => (
                  <tr key={record._id} onClick={() => this.edit(record)}>
                    <td>{index + 1}</td>
                    <td>{moment(record.date).format("ll")}</td>
                    <td>{record.account.name}</td>
                    <td>{record.particulars}</td>
                    <td>{numberFormat(record.amount)}</td>
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

export default AccountPayments;
