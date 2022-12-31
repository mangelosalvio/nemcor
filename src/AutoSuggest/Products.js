import axios from "axios";
import React from "react";

const objects = "products";
const object = "product";
const url = "/api/products/";

/**
 * Autocomplete for chart of accounts
 */

const onChange = (component, event, { newValue, method }) => {
  component.setState({ [event.target.name]: newValue });
};

const onSuggestionsFetchRequested = (component, { value }) => {
  axios
    .get(url + "?s=" + value)
    .then(response => component.setState({ [objects]: response.data }))
    .catch(err => console.log(err));
};

const onSuggestionsClearRequested = component => {
  component.setState({ [objects]: [] });
};

const renderSuggestion = suggestion => <div>{suggestion.name}</div>;

const onSuggestionSelected = (component, event, { suggestion }) => {
  event.preventDefault();
  component.setState({ [object]: suggestion });
};

const getSuggestionValue = suggestion => suggestion.name;

const inputProps = {
  placeholder: "Type Product Name",
  name: "product_name",
  className: "input",
  "data-state": "product"
};

/**
 * end of autocomplete for chart of accounts
 */

export default {
  onChange,
  onSuggestionsFetchRequested,
  onSuggestionsClearRequested,
  renderSuggestion,
  getSuggestionValue,
  onSuggestionSelected,
  inputProps
};
