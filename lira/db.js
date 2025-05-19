const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PG_DB || 'lira_exchange',
  process.env.PG_USER || 'postgres',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize; 