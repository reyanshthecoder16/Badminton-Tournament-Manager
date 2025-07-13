const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Player = sequelize.define('Player', {
  name: { type: DataTypes.STRING, allowNull: false },
  initialRating: { type: DataTypes.INTEGER, allowNull: false },
  currentRating: { type: DataTypes.INTEGER, allowNull: false },
  joiningDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  gender: { type: DataTypes.ENUM('M','F'), defaultValue: 'M' },
  present: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastRatingUpdatedOn: { type: DataTypes.DATE, allowNull: true },
  // rating: { type: DataTypes.INTEGER, allowNull: false }, // deprecated
});

module.exports = Player;