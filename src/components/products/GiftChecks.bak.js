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
import moment from "moment-timezone";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";

const collection_name = "gift_checks";

const form_data = {
  title: "Gift Checks",
  url: "/api/gift-checks/",
  search_keyword: "",
  errors: {},
  [collection_name]: [],

  _id: "",
  date: "",
  items: [],

  date_of_expiry: null,
  from_gc_no: "",
  to_gc_no: "",
  amount: ""
};

class GiftChecks extends Component {
  state = {
    ...form_data
  };

  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  /**
   * RAW MATERIALS AUTOSUGGEST
   */

  onRawMaterialSuggestChange = (event, { newValue, method }) => {
    this.setState({ [event.target.name]: newValue });
  };

  onRawMaterialsSuggestionsFetchRequested = ({ value }) => {
    axios
      .get("/api/products/?s=" + value)
      .then(response =>
        this.setState({ ["products_suggestions"]: response.data })
      )
      .catch(err => console.log(err));
  };

  onRawMaterialsSuggestionsClearRequested = () => {
    this.setState({ ["products_suggestions"]: [] });
  };

  onRawMaterialsRenderSuggestion = suggestion => <div>{suggestion.name}</div>;

  onRawMaterialsSuggestionSelected = (event, { suggestion }) => {
    event.preventDefault();
    this.setState({
      raw_material: suggestion,
      raw_material_name: suggestion.name
    });
  };

  onRawMaterialsGetSuggestionValue = suggestion => suggestion.name;

  onGiftCheckAdd = () => {
    let items = [...this.state.items];
    for (let i = this.state.from_gc_no; i <= this.state.to_gc_no; i++) {
      items = [
        ...items,
        {
          date_of_expiry: this.state.date_of_expiry,
          gift_check_number: i,
          amount: this.state.amount
        }
      ];
    }

    this.setState({
      items,
      date_of_expiry: null,
      from_gc_no: "",
      to_gc_no: "",
      amount: ""
    });
  };

  onDeleteGCItem = record => {
    const { items } = this.state;
    const index = items.indexOf(record);
    items.splice(index, 1);
    this.setState({
      items
    });
  };

  /**
   * END RAW MATERIALS AUTOSUGGEST
   */

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
      () => {}
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

  onSuggestionsFetchRequested = ({ value }) => {
    axios
      .get("/api/categories/?s=" + value)
      .then(response => this.setState({ categories: response.data }))
      .catch(err => console.log(err));
  };

  onSuggestionsClearRequested = () => {
    this.setState({ categories: [] });
  };

  renderSuggestion = suggestion => <div>{suggestion.name}</div>;

  onCategoryChange = (event, { newValue, method }) => {
    this.setState({ category_name: newValue });
  };

  onSuggestionSelected = (event, { suggestion }) => {
    event.preventDefault();
    this.setState({ category: suggestion });
  };

  getSuggestionValue = suggestion => suggestion.name;

  render() {
    const { errors, categories } = this.state;

    const inputProps = {
      placeholder: "Type category name",
      value: this.state.category_name,
      onChange: this.onCategoryChange,
      name: "category_name",
      className: "input"
    };

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
              <div>
                <div className="field">
                  <Divider label="Gift Checks" />
                  <div className="columns">
                    <div className="column is-2">
                      <DatePickerFieldGroup
                        label="Expiry Date"
                        error={errors.date_of_expiry}
                        date={this.state.date_of_expiry}
                        onChange={date =>
                          this.setState({ date_of_expiry: date })
                        }
                      />
                    </div>

                    <div className="column is-1">
                      <TextFieldGroup
                        label="From"
                        name="from_gc_no"
                        value={this.state.from_gc_no}
                        onChange={this.onChange}
                        error={errors.from_gc_no}
                        type="number"
                      />
                    </div>
                    <div className="column is-1">
                      <TextFieldGroup
                        label="To"
                        name="to_gc_no"
                        value={this.state.to_gc_no}
                        onChange={this.onChange}
                        error={errors.to_gc_no}
                      />
                    </div>
                    <div className="column is-2">
                      <TextFieldGroup
                        label="Amount"
                        name="amount"
                        value={this.state.amount}
                        onChange={this.onChange}
                        error={errors.amount}
                        type="number"
                      />
                    </div>
                    <div
                      className="column is-1"
                      style={{ display: "flex", alignItems: "flex-end" }}
                    >
                      <input
                        type="button"
                        onClick={this.onGiftCheckAdd}
                        className="button"
                        value="Add"
                      />
                    </div>
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
                  <div className="columns">
                    <table className="table full-width min-table">
                      <thead>
                        <tr>
                          <th style={{ width: "4%" }} />
                          <th style={{ width: "4%" }}>#</th>
                          <th>EXPIRY DATE</th>
                          <th>GC NO</th>
                          <th className="has-text-right">AMOUNT</th>
                          <th className="has-text-left">USED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.items.map((record, i) => (
                          <tr key={i}>
                            <td>
                              <span
                                className={classnames("icon is-small", {
                                  "display-none": !isEmpty(record.used)
                                })}
                                style={{ cursor: "pointer" }}
                                onClick={() => this.onDeleteGCItem(record)}
                              >
                                <i className="fas fa-times" />
                              </span>
                            </td>
                            <td>{i + 1}</td>
                            <td>
                              {moment(record.date_of_expiry).format("ll")}
                            </td>
                            <td>{record.gift_check_number}</td>
                            <td className="has-text-right">
                              {numberFormat(record.amount)}
                            </td>
                            <td>
                              {record.used && (
                                <div>
                                  SI# : {record.used.sale.sales_id} <br />
                                  {moment(record.used.sale.datetime).format(
                                    "lll"
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th />
                          <th />
                          <th />
                          <th />
                          <th className="has-text-right">
                            {numberFormat(
                              sumBy(this.state.items, o => parseFloat(o.amount))
                            )}
                          </th>
                          <th />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {this.state[collection_name].map((record, index) => (
                  <tr key={record._id} onClick={() => this.edit(record)}>
                    <td>{index + 1}</td>
                    <td>{moment(record.date).format("ll")}</td>
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

export default GiftChecks;
