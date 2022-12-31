import React from "react";
import Autosuggest from "react-autosuggest/dist/Autosuggest";
import classnames from "classnames";
import PropTypes from "prop-types";

const AutoSuggestFieldGroup = ({
  label,
  error,
  inputProps,
  suggestions,
  onSuggestionsFetchRequested,
  onSuggestionsClearRequested,
  onSuggestionSelected,
  renderSuggestion,
  getSuggestionValue,
  inputRef
}) => (
  <div className="field">
    <label className="label">{label}</label>
    <div className="control">
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
        onSuggestionSelected={onSuggestionSelected}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={renderSuggestion}
        inputProps={inputProps}
        ref={inputRef}
      />

      {error && (
        <p
          className={classnames("help", {
            "is-danger": error
          })}
        >
          {error}
        </p>
      )}
    </div>
  </div>
);

AutoSuggestFieldGroup.propTypes = {
  suggestions: PropTypes.array.isRequired,
  onSuggestionsFetchRequested: PropTypes.func.isRequired,
  onSuggestionsClearRequested: PropTypes.func.isRequired,
  onSuggestionSelected: PropTypes.func.isRequired,
  getSuggestionValue: PropTypes.func.isRequired,
  renderSuggestion: PropTypes.func.isRequired,
  inputProps: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  ref: PropTypes.func
};

export default AutoSuggestFieldGroup;
