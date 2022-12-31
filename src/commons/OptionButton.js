import React from "react";
import PropTypes from "prop-types";

const OptionButton = ({ icon, label, onClick }) => {
  return (
    <div className="full-bordered button option-button" onClick={onClick}>
      <span className="icon">
        <i className={icon} />
      </span>
      <span>{label}</span>
    </div>
  );
};

Option.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default OptionButton;
