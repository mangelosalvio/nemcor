import React from "react";
import PropTypes from "prop-types";

const OptionBillingButton = ({ icon, label, onClick }) => {
  return (
    <div
      className="full-bordered button is-primary has-text-weight-bold option-billing-button"
      onClick={onClick}
    >
      <span className="icon">
        <i className={icon} />
      </span>
      <span>{label}</span>
    </div>
  );
};

OptionBillingButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default OptionBillingButton;
