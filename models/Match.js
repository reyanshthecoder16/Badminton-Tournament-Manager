const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Player = require('./Player');
const MatchDay = require('./MatchDay');

const RatingAwards = sequelize.define('RatingAwards', {
  Rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
});

const Match = sequelize.define('Match', {
  court: { type: DataTypes.INTEGER },
  matchCode: { type: DataTypes.STRING },
  matchType: { type: DataTypes.STRING },
  date: { type: DataTypes.DATE },
  team1: { type: DataTypes.JSON }, // array of player IDs
  team2: { type: DataTypes.JSON }, // array of player IDs
  score: { type: DataTypes.STRING },
  winnerIds: { type: DataTypes.JSON },
  loserIds: { type: DataTypes.JSON },
});

Match.belongsToMany(Player, { through: RatingAwards });
Player.belongsToMany(Match, { through: RatingAwards });

// Explicitly define associations for RatingAwards
RatingAwards.belongsTo(Match);
RatingAwards.belongsTo(Player);
Match.hasMany(RatingAwards);
Player.hasMany(RatingAwards);

Match.belongsTo(MatchDay);
MatchDay.hasMany(Match);

module.exports = { Match, RatingAwards };