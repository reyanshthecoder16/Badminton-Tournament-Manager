const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MatchDay = sequelize.define('MatchDay', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
});

module.exports = MatchDay;
