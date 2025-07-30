const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MatchDay = sequelize.define('MatchDay', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  finalized: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = MatchDay;
