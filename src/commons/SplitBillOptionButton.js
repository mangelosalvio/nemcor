import React from "react";
import PropTypes from "prop-types";

const SplitBillOptioButton = ({ icon, label, onClick }) => {
  return (
    <div
      className="full-bordered button is-12 column is-primary update-button"
      onClick={onClick}
    >
      {icon && (
        <span className="icon">
          <i className={icon} />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
};

SplitBillOptioButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default SplitBillOptioButton;
