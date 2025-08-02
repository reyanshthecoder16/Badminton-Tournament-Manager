const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Player = require('./Player');
const MatchDay = require('./MatchDay');

const PlayerRatingSnapshot = sequelize.define('PlayerRatingSnapshot', {
  playerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  matchDayId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'PlayerRatingSnapshots',
});

PlayerRatingSnapshot.belongsTo(Player, { foreignKey: 'playerId' });
PlayerRatingSnapshot.belongsTo(MatchDay, { foreignKey: 'matchDayId' });

module.exports = PlayerRatingSnapshot;
