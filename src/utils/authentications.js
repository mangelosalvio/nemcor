const { USER_ADMIN, USER_OWNER } = require("./constants");
const { message } = require("antd");

module.exports.authenticateAdmin = ({ role, history }) => {
  /* if (![USER_ADMIN, USER_OWNER].includes(role)) {
    history.push("/");
    message.error("You don't have the access rights to access the page.");
  } */
};

module.exports.authenticateOwner = ({ role, history }) => {
  /* if (![USER_OWNER].includes(role)) {
    history.push("/");
    message.error("You don't have the access rights to access the page.");
  } */
};
