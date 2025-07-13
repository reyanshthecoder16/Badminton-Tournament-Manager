const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Player = require('./Player');
const MatchDay = require('./MatchDay');

const Attendance = sequelize.define('Attendance', {
  present: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

Attendance.belongsTo(Player);
Attendance.belongsTo(MatchDay);

module.exports = Attendance;
