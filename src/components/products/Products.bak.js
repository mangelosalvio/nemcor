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

const collection_name = "products";

const form_data = {
  title: "Products",
  url: "/api/products/",
  search_keyword: "",
  errors: {},
  products: [],
  categories: [],
  _id: "",
  name: "",
  category: {},
  category_name: "",
  price: "",
  products_suggestions: [],
  raw_materials: [],
  raw_material_name: "",
  raw_material_quantity: ""
};

class Products extends Component {
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
      .get(this.state.url + "?s=" + value)
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

  onRawMaterialAdd = () => {
    const raw_materials = [
      {
        raw_material: this.state.raw_material,
        raw_material_quantity: this.state.raw_material_quantity
      },
      ...this.state.raw_materials
    ];

    this.setState({
      raw_materials,
      raw_material: "",
      raw_material_name: "",
      raw_material_quantity: ""
    });
  };

  onDeleteRawMaterial = raw_material => {
    const { raw_materials } = this.state;
    const index = raw_materials.indexOf(raw_material);
    raw_materials.splice(index, 1);
    this.setState({ raw_materials });
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
            category_name: data.category.name,
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
            category_name: data.category.name,
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
          products: response.data,
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
        this.product_name_input.focus();
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
          _id: "",
          name: "",
          price: "",
          category_name: "",
          category: {},
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
                  label="Product Name"
                  name="name"
                  value={this.state.name}
                  onChange={this.onChange}
                  error={errors.name}
                  inputRef={input => (this.product_name_input = input)}
                />

                <TextFieldGroup
                  label="Price"
                  name="price"
                  value={this.state.price}
                  onChange={this.onChange}
                  error={errors.price}
                />

                <div className="field">
                  <label className="label">Category</label>
                  <div className="control">
                    <Autosuggest
                      suggestions={categories}
                      onSuggestionsFetchRequested={
                        this.onSuggestionsFetchRequested
                      }
                      onSuggestionsClearRequested={
                        this.onSuggestionsClearRequested
                      }
                      onSuggestionSelected={this.onSuggestionSelected}
                      getSuggestionValue={this.getSuggestionValue}
                      renderSuggestion={this.renderSuggestion}
                      inputProps={inputProps}
                    />

                    {errors.category && (
                      <p
                        className={classnames("help", {
                          "is-danger": errors.category
                        })}
                      >
                        {errors.category}
                      </p>
                    )}
                  </div>
                </div>

                <div className="field">
                  <Divider label="Raw Materials" />
                  <div className="columns">
                    <div className="column">
                      <AutoSuggestFieldGroup
                        label="Item"
                        error={errors.raw_material}
                        suggestions={this.state.products_suggestions}
                        onSuggestionsFetchRequested={
                          this.onRawMaterialsSuggestionsFetchRequested
                        }
                        onSuggestionsClearRequested={
                          this.onRawMaterialsSuggestionsClearRequested
                        }
                        onSuggestionSelected={
                          this.onRawMaterialsSuggestionSelected
                        }
                        getSuggestionValue={
                          this.onRawMaterialsGetSuggestionValue
                        }
                        renderSuggestion={this.onRawMaterialsRenderSuggestion}
                        inputProps={{
                          placeholder: "Type Item Name",
                          name: "raw_material_name",
                          className: "input",
                          onChange: this.onRawMaterialSuggestChange,
                          value: this.state.raw_material_name
                        }}
                      />
                    </div>
                    <div className="column is-2">
                      <TextFieldGroup
                        label="Quantity"
                        name="raw_material_quantity"
                        value={this.state.raw_material_quantity}
                        onChange={this.onChange}
                        error={errors.raw_material_quantity}
                      />
                    </div>
                    <div
                      className="column is-1"
                      style={{ display: "flex", alignItems: "flex-end" }}
                    >
                      <input
                        type="button"
                        onClick={this.onRawMaterialAdd}
                        className="button"
                        value="Add"
                      />
                    </div>
                  </div>
                  <div className="columns">
                    <table className="table full-width min-table">
                      <thead>
                        <tr>
                          <th style={{ width: "4%" }} />
                          <th style={{ width: "4%" }}>#</th>
                          <th>RAW MATERIAL</th>
                          <th className="has-text-right">QUANTITY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.raw_materials.map((record, i) => (
                          <tr key={i}>
                            <td>
                              <span
                                className="icon is-small"
                                style={{ cursor: "pointer" }}
                                onClick={() => this.onDeleteRawMaterial(record)}
                              >
                                <i className="fas fa-times" />
                              </span>
                            </td>
                            <td>{i + 1}</td>
                            <td>{record.raw_material.name}</td>
                            <td className="has-text-right">
                              {numberFormat(record.raw_material_quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th />
                          <th />
                          <th />
                          <th className="has-text-right">
                            {numberFormat(
                              sumBy(this.state.raw_materials, o =>
                                parseFloat(o.raw_material_quantity)
                              )
                            )}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
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
              </div>
            </form>
          ) : (
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Price</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {this.state.products.map((product, index) => (
                  <tr key={product._id} onClick={() => this.edit(product)}>
                    <td>{index + 1}</td>
                    <td>{product.name}</td>
                    <td>{product.price}</td>
                    <td>{product.category.name}</td>
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

export default Products;
