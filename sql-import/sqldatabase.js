const { Sequelize } = require("sequelize");

const {
  SQL_DIALECT,
  SQL_DB_HOST,
  SQL_DB_USER,
  SQL_DB_PASSWORD,
  SQL_DB_NAME,
} = process.env;

module.exports = new Sequelize(SQL_DB_NAME, SQL_DB_USER, SQL_DB_PASSWORD, {
  dialect: SQL_DIALECT,
  host: SQL_DB_HOST,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
