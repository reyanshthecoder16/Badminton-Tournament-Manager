const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { Match, RatingAwards } = require('../models/Match');
const { Op, Sequelize } = require('sequelize');

/**
 * @swagger
 * /api/public/players/performance:
 *   get:
 *     summary: Get all players performance (public access)
 *     responses:
 *       200:
 *         description: List of players with performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// POST /api/public/matches - Create a new match
router.post('/matches', async (req, res) => {
  try {
    const { matchCode, matchType, date, court, team1, team2, MatchDayId } = req.body;
    if (!matchCode || !matchType || !date || !court || !team1 || !team2) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const match = await Match.create({
      matchCode,
      matchType,
      date,
      court,
      team1,
      team2,
      MatchDayId
    });
    res.status(201).json(match);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// GET /api/public/players/performance - Public access to player performance
/**
 * @swagger
 * /api/public/players/snapshots:
 *   get:
 *     summary: Get player rating snapshots (public access)
 *     responses:
 *       200:
 *         description: List of players with rating snapshots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// GET /api/public/players/snapshots - performance snapshots per player per finalized match day
router.get('/players/snapshots', async (req, res) => {
  try {
    const Player = require('../models/Player');
    const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');
    const MatchDay = require('../models/MatchDay');

    const players = await Player.findAll({ order: [['currentRating', 'DESC']] });

    const snapshots = await PlayerRatingSnapshot.findAll({
      include: [{ model: MatchDay, attributes: ['date'] }],
      order: [['matchDayId', 'DESC']]
    });

    const snapshotsByPlayer = {};
    for (const snap of snapshots) {
      if (!snapshotsByPlayer[snap.playerId]) snapshotsByPlayer[snap.playerId] = [];
      snapshotsByPlayer[snap.playerId].push({
        date: snap.MatchDay.date,
        rating: snap.rating
      });
    }

    const result = players.map(p => ({
      id: p.id,
      name: p.name,
      initialRating: p.initialRating,
      currentRating: p.currentRating,
      snapshots: snapshotsByPlayer[p.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching player snapshots:', err);
    res.status(500).json({ error: 'Failed to fetch player snapshots' });
  }
});

router.get('/players/performance', async (req, res) => {
  try {
    const players = await Player.findAll({
      order: [['currentRating', 'DESC']]
    });
    
    const performance = await Promise.all(players.map(async player => {
      try {
        // Get all RatingAwards for this player
        const awards = await RatingAwards.findAll({ where: { PlayerId: player.id } });
        
        // Get all matches played by this player
        const matchIds = awards.map(a => a.MatchId);
        const matches = await Match.findAll({ 
          where: { id: matchIds },
          order: [['date', 'DESC']]
        });
        
        // Map match info and points for each match (preserve sorted order)
        const matchDetails = matches.map(match => {
          const award = awards.find(a => a.MatchId === match.id);
          return award ? {
            matchId: match.id,
            date: match.date,
            matchCode: match.matchCode,
            court: match.court,
            score: match.score,
            points: award.Rating
          } : null;
        }).filter(Boolean);
        
        // Sum of all points
        const totalPoints = awards.reduce((sum, a) => sum + (a.Rating || 0), 0);
        
        return {
          id: player.id,
          name: player.name,
          initialRating: player.initialRating,
          currentRating: player.currentRating,
          totalPoints,
          lastRatingUpdatedOn: player.lastRatingUpdatedOn,
          matches: matchDetails,
          matchesPlayed: matchDetails.length
        };
      } catch (error) {
        console.error(`Error processing player ${player.id}:`, error);
        return {
          id: player.id,
          name: player.name,
          initialRating: player.initialRating,
          currentRating: player.currentRating,
          totalPoints: 0,
          lastRatingUpdatedOn: player.lastRatingUpdatedOn,
          matches: [],
          matchesPlayed: 0
        };
      }
    }));
    
    res.json(performance);
  } catch (error) {
    console.error('Error fetching public player performance:', error);
    res.status(500).json({ error: 'Failed to fetch player performance' });
  }
});

/**
 * @swagger
 * /api/public/players:
 *   get:
 *     summary: Get all players (public access)
 *     responses:
 *       200:
 *         description: List of players
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// GET /api/public/players - Public access to player list
router.get('/players', async (req, res) => {
  try {
    const players = await Player.findAll({
      order: [['currentRating', 'DESC']],
      attributes: ['id', 'name', 'currentRating', 'initialRating', 'joiningDate']
    });
    res.json(players);
  } catch (error) {
    console.error('Error fetching public players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * @swagger
 * /api/public/schedule/current:
 *   get:
 *     summary: Get current day schedule (public access)
 *     responses:
 *       200:
 *         description: Current day schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

// GET /api/public/schedule/current - Public access to current day schedule
router.get('/schedule/current', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { Match } = require('../models/Match');
    const Player = require('../models/Player');
    
    const matches = await Match.findAll({
      where: { date: today },
      order: [['court', 'ASC'], ['id', 'ASC']]
    });
    
    // Group by court and resolve player names
    const courts = {};
    for (const match of matches) {
      if (!courts[match.court]) courts[match.court] = [];
      courts[match.court].push(match);
    }
    
    const result = await Promise.all(Object.entries(courts).map(async ([court, matches]) => {
      const formattedMatches = await Promise.all(matches.map(async match => {
        const team1Players = match.team1 ? await Player.findAll({ where: { id: match.team1 } }) : [];
        const team2Players = match.team2 ? await Player.findAll({ where: { id: match.team2 } }) : [];
        return {
          id: match.id,
          matchCode: match.matchCode,
          matchType: match.matchType,
          team1Names: team1Players.map(p => p.name),
          team2Names: team2Players.map(p => p.name),
          score: match.score || ''
        };
      }));
      return { court, matches: formattedMatches };
    }));
    
      res.json(result);
} catch (error) {
  console.error('Error fetching public current schedule:', error);
  res.status(500).json({ error: 'Failed to fetch current schedule' });
}
});

/**
 * @swagger
 * /api/public/matches/{matchId}:
 *   get:
 *     summary: Get detailed match information (public access)
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Match details with team information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

// GET /api/public/matches/:matchId - Public access to match details
router.get('/matches/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { Match } = require('../models/Match');
    const Player = require('../models/Player');
    
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Get team players
    const team1Players = match.team1 ? await Player.findAll({ where: { id: match.team1 } }) : [];
    const team2Players = match.team2 ? await Player.findAll({ where: { id: match.team2 } }) : [];
    
    // Determine winner
    let winner = null;
    if (match.winnerIds && match.winnerIds.length > 0) {
      const winnerIds = match.winnerIds.sort().join(',');
      const team1Ids = team1Players.map(p => p.id).sort().join(',');
      const team2Ids = team2Players.map(p => p.id).sort().join(',');
      
      if (winnerIds === team1Ids) {
        winner = 'team1';
      } else if (winnerIds === team2Ids) {
        winner = 'team2';
      }
    }
    
    const matchDetails = {
      id: match.id,
      matchCode: match.matchCode,
      matchType: match.matchType,
      date: match.date,
      court: match.court,
      score: match.score,
      team1Players,
      team2Players,
      winner
    };
    
    res.json(matchDetails);
  } catch (error) {
    console.error('Error fetching public match details:', error);
    res.status(500).json({ error: 'Failed to fetch match details' });
  }
});

/**
 * @swagger
 * /api/public/schedule/matchdays:
 *   get:
 *     summary: Get all match days (public access)
 *     responses:
 *       200:
 *         description: A list of match days
 */
router.get('/schedule/matchdays', async (req, res) => {
  try {
    const matchDays = await Match.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('date')), 'match_day'],
      ],
      order: [['date', 'DESC']],
    });
    res.json(matchDays);
  } catch (error) {
    console.error('Error fetching public match days:', error);
    res.status(500).json({ error: 'Failed to fetch match days' });
  }
});

/**
 * @swagger
 * /api/public/players/top-by-rating-change:
 *   get:
 *     summary: Get top 10 players by rating change for a specific match day
 *     parameters:
 *       - in: query
 *         name: matchDay
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: A list of top 10 players with their rating changes
 */
router.get('/players/top-by-rating-change', async (req, res) => {
  const { matchDay } = req.query;

  if (!matchDay) {
    return res.status(400).json({ error: 'matchDay query parameter is required' });
  }

  try {
    const awards = await RatingAwards.findAll({
      include: [
        {
          model: Match,
          where: { date: matchDay },
          attributes: [],
        },
        {
          model: Player,
          attributes: ['id', 'name'],
        },
      ],
    });

    const playerRatingChanges = {};

    awards.forEach(award => {
      if (!playerRatingChanges[award.Player.id]) {
        playerRatingChanges[award.Player.id] = {
          player_id: award.Player.id,
          name: award.Player.name,
          rating_change: 0,
          new_rating: award.newRating, // Store the latest rating
        };
      }
      playerRatingChanges[award.Player.id].rating_change += (award.newRating - award.oldRating);
    });

    const sortedPlayers = Object.values(playerRatingChanges)
      .sort((a, b) => b.rating_change - a.rating_change)
      .slice(0, 10);

    res.json(sortedPlayers);
  } catch (error) {
    console.error('Error fetching top players by rating change:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

module.exports = router; 