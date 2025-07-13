const { Match, RatingAwards } = require('../models/Match');
const Player = require('../models/Player');
const MatchDay = require('../models/MatchDay');
const Attendance = require('../models/Attendance');

async function generateSchedule(date = new Date()) {
  try {
    let matchDay = await MatchDay.findOne({ where: { date } });
    if (!matchDay) matchDay = await MatchDay.create({ date });

    // Defensive: check Attendance table exists and query works
    let attendance;
    try {
      attendance = await Attendance.findAll({ where: { MatchDayId: matchDay.id, present: true }, include: Player });
    } catch (err) {
      console.error('Attendance query error:', err);
      throw err;
    }
    const present = attendance.filter(a => a.Player).map(a => a.Player);
    const courts = [];
    for (let i = 0; i < present.length; i += 8) {
      const group = present.slice(i, i + 8);
      if (group.length < 8) break;
      const codes = [
        ['M1', [[0,3],[1,2]]], ['M2', [[4,7],[5,6]]], ['M4', [[0,7],[1,6]]], ['M3', [[2,5],[3,4]]],
        ['M5', [[0],[1]]], ['M6', [[2],[3]]], ['M7', [[4],[5]]], ['M8', [[6],[7]]],
        ['M9', [[0,2],[1,3]]], ['M10',[[4,6],[5,7]]], ['M11',[[0,1],[2,3]]], ['M12',[[4,5],[6,7]]]
      ];
      const matches = [];
      for (const [code, [t1, t2]] of codes) {
        const team1 = t1.map(idx => group[idx].id);
        const team2 = t2.map(idx => group[idx].id);
        const match = await Match.create({
          court: (i/8)+1,
          matchCode: code,
          matchType: t1.length === 1 && t2.length === 1 ? 'singles' : 'doubles',
          date,
          team1,
          team2,
          MatchDayId: matchDay.id
        });
        // Fetch Player instances and add to match
        for (const pid of [...team1, ...team2]) {
          const player = await Player.findByPk(pid);
          if (player) {
            await match.addPlayer(player, { through: { Rating: 0 } });
            console.log(`Added RatingAwards entry for MatchId ${match.id}, PlayerId ${pid}`);
          } else {
            console.log(`PlayerId ${pid} not found, cannot add to MatchId ${match.id}`);
          }
        }
        matches.push(match);
        console.log(`Created match ${match.id} with players:`, [...team1, ...team2]);
      }
      courts.push({ court: (i/8)+1, matches });
    }
    return courts;
  } catch (error) {
    console.error('generateSchedule error:', error);
    throw error;
  }
}

async function recordResult(matchId, winnerIds, score) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new Error(`Match with id ${matchId} not found`);

  // Get all player IDs for this match from RatingAwards
  const awards = await RatingAwards.findAll({ where: { MatchId: matchId } });
  console.log(`RatingAwards entries for MatchId ${matchId}:`, awards.map(a => ({ PlayerId: a.PlayerId, Rating: a.Rating })));
  const allIds = awards.map(a => a.PlayerId);
  const loserIds = allIds.filter(id => !winnerIds.includes(id));

  match.score = score;
  match.winnerIds = winnerIds;
  match.loserIds = loserIds;
  await match.save();
  console.log('Updated match.loserIds:', match.loserIds);

  // Calculate rating changes but only store in RatingAwards
  const winners = await Player.findAll({ where: { id: winnerIds } });
  const losers = await Player.findAll({ where: { id: loserIds } });
  let wDelta, lDelta;
  const code = match.matchCode;
  if (["M1","M2","M3","M4"].includes(code)) { wDelta=5; lDelta=-5; }
  else if (["M5","M6","M7","M8"].includes(code)) { wDelta=10; lDelta=-10; }
  else if (["M9","M10","M11","M12"].includes(code)) {
    const winningTeamRatingsSum = winners.reduce((s,p)=>s+(p.currentRating||0),0);
    const losingTeamRatingsSum = losers.reduce((s,p)=>s+(p.currentRating||0),0);
    console.log(`winningTeamRatingsSum: ${winningTeamRatingsSum}, losingTeamRatingsSum: ${losingTeamRatingsSum}`);
    
    const isWiningTeamWeaker = winningTeamRatingsSum<losingTeamRatingsSum;
    console.log(`isWiningTeamWeaker: ${isWiningTeamWeaker}`);
    if (["M9","M10"].includes(code))
      [wDelta,lDelta] = isWiningTeamWeaker ? [10,-10] : [5,-5];
    else if (["M11","M12"].includes(code))
      [wDelta,lDelta] = isWiningTeamWeaker ? [15,-15] : [5,-5];
  } else {
    const sumW = winners.reduce((s,p)=>s+(p.currentRating||p.rating||0),0);
    const sumL = losers.reduce((s,p)=>s+(p.currentRating||p.rating||0),0);
    [wDelta,lDelta] = sumW<sumL ? [15,-5] : [5,-15];
  }

  // Store rating changes in RatingAwards table only
  for (const p of winners) {
    const [affectedRows] = await RatingAwards.update({ Rating: wDelta }, { where: { MatchId: match.id, PlayerId: p.id } });
    console.log(`RatingAwards update for winner PlayerId ${p.id}:`, affectedRows);
  }
  for (const p of losers) {
    const [affectedRows] = await RatingAwards.update({ Rating: lDelta }, { where: { MatchId: match.id, PlayerId: p.id } });
    console.log(`RatingAwards update for loser PlayerId ${p.id}:`, affectedRows);
  }

  console.log('Final match object:', match.toJSON());
  return match;
}

async function finalizeMatches(matchDayId) {
  try {
    // Get all matches for the given matchDayId
    const matches = await Match.findAll({ where: { MatchDayId: matchDayId } });
    if (!matches.length) throw new Error(`No matches found for matchDayId ${matchDayId}`);

    // Get all RatingAwards for these matches
    const matchIds = matches.map(m => m.id);
    const ratingAwards = await RatingAwards.findAll({ where: { MatchId: matchIds } });

    // Group ratings by player
    const playerRatings = {};
    for (const award of ratingAwards) {
      if (!playerRatings[award.PlayerId]) {
        playerRatings[award.PlayerId] = 0;
      }
      playerRatings[award.PlayerId] += award.Rating;
    }

    // Update player ratings and lastRatingUpdatedOn
    const now = new Date();
    for (const [playerId, totalDelta] of Object.entries(playerRatings)) {
      const player = await Player.findByPk(playerId);
      if (player) {
        await player.update({ currentRating: player.currentRating + totalDelta, lastRatingUpdatedOn: now });
        console.log(`Updated currentRating for player ${playerId}: ${player.currentRating} (${totalDelta > 0 ? '+' : ''}${totalDelta}), lastRatingUpdatedOn: ${now}`);
      }
    }

    return { message: 'Match ratings finalized', updatedPlayers: Object.keys(playerRatings).length };
  } catch (error) {
    console.error('finalizeMatches error:', error);
    throw error;
  }
}


module.exports = { generateSchedule, recordResult, finalizeMatches };