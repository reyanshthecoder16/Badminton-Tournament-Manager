const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { Match, RatingAwards } = require('../models/Match');

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

// GET /api/public/players/performance - Public access to player performance
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
        
        // Map match info and points for each match
        const matchDetails = awards.map(a => {
          const match = matches.find(m => m.id === a.MatchId);
          return match ? {
            matchId: match.id,
            date: match.date,
            matchCode: match.matchCode,
            court: match.court,
            score: match.score,
            points: a.Rating
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

module.exports = router; 