import { useNavigate, useParams } from "react-router-dom";

// in hocs.js
export const withNavigation = (Component) => {
  return (props) => <Component {...props} navigate={useNavigate()} />;
};

export const withParams = (Component) => {
  return (props) => (
    <Component {...props} navigate={useNavigate()} params={useParams()} />
  );
};
