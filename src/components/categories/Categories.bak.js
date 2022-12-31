import React, { Component } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Navbar from "../Navbar";
import axios from "axios";
import isEmpty from "../../validation/is-empty";
import MessageBoxInfo from "../../commons/MessageBoxInfo";
import Searchbar from "../../commons/Searchbar";
import CheckboxFieldGroup from "../../commons/CheckboxFieldGroup";

const collection_name = "categories";
const form_data = {
  _id: "",
  name: "",
  not_in_menu: false,
  print_station: "",
  [collection_name]: []
};

class Categories extends Component {
  state = {
    url: "/api/categories/",
    search_keyword: "",
    errors: {},
    categories: [],
    ...form_data
  };

  onChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  };

  onSubmit = e => {
    e.preventDefault();

    if (isEmpty(this.state._id)) {
      axios
        .put(this.state.url, this.state)
        .then(({ data }) =>
          this.setState({
            name: data.name,
            _id: data._id,
            print_station: data.print_station,
            errors: {},
            message: "Transaction Saved"
          })
        )
        .catch(err => this.setState({ errors: err.response.data }));
    } else {
      axios
        .post(this.state.url + this.state._id, this.state)
        .then(({ data }) =>
          this.setState({
            name: data.name,
            _id: data._id,
            print_station: data.print_station,
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
          categories: response.data,
          message: isEmpty(response.data) ? "No rows found" : ""
        })
      )
      .catch(err => console.log(err));
  };

  addNew = () => {
    this.setState(
      {
        categories: [],
        name: "",
        _id: null,
        errors: {},
        message: ""
      },
      () => {
        this.category_name_input.focus();
      }
    );
  };

  edit = record => {
    axios
      .get(this.state.url + record._id)
      .then(response => {
        this.setState({
          ...form_data,
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
          <span className="is-size-5">Categories</span>{" "}
          <button className="button is-small" onClick={this.addNew}>
            Add New
          </button>
          <hr />
          <MessageBoxInfo message={this.state.message} onHide={this.onHide} />
          {isEmpty(this.state.categories) ? (
            <form onSubmit={this.onSubmit}>
              <div>
                <TextFieldGroup
                  label="Category Name"
                  name="name"
                  value={this.state.name}
                  onChange={this.onChange}
                  error={errors.name}
                  inputRef={input => {
                    this.category_name_input = input;
                  }}
                />

                <TextFieldGroup
                  label="Printing Station"
                  name="print_station"
                  value={this.state.print_station}
                  onChange={this.onChange}
                  error={errors.print_station}
                />

                <CheckboxFieldGroup
                  label="Not in Menu"
                  name="not_in_menu"
                  onChange={this.onChange}
                  error={errors.not_in_menu}
                  checked={this.state.not_in_menu}
                />

                <div className="field is-grouped">
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
                  <th>Category Name</th>
                  <th>Print Station</th>
                </tr>
              </thead>
              <tbody>
                {this.state.categories.map((category, index) => (
                  <tr key={category._id} onClick={() => this.edit(category)}>
                    <td>{index + 1}</td>
                    <td>{category.name}</td>
                    <td>{category.print_station}</td>
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

export default Categories;
