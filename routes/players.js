const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

/**
 * @swagger
 * /api/players/import:
 *   post:
 *     summary: Import a list of players with initial ratings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               players:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     rating:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Players imported
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 * /api/players:
 *   get:
 *     summary: Get all players sorted by rating
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

// POST /api/players/import
router.post('/import', async (req, res) => {
  const { players } = req.body;
  await Player.destroy({ where: {} });
  // Set initialRating, currentRating, joiningDate for each player
  const docs = await Player.bulkCreate(players.map(p => ({
    name: p.name,
    initialRating: p.rating,
    currentRating: p.rating,
    joiningDate: new Date(),
    gender: p.gender || 'M',
    present: p.present || false
  })));
  res.json(docs);
});

// GET /api/players
router.get('/', async (req, res) => {
  const list = await Player.findAll({ order: [['currentRating','DESC']] });
  res.json(list);
});

/**
 * GET /api/players/performance
 * Returns each player's name, initialRating, currentRating, total points (sum of RatingAwards), and matches played (with match info and points for that match)
 */
router.get('/performance', async (req, res) => {
  const Player = require('../models/Player');
  const { Match, RatingAwards } = require('../models/Match');
  try {
    const players = await Player.findAll();
    const performance = await Promise.all(players.map(async player => {
      // Get all RatingAwards for this player
      const awards = await RatingAwards.findAll({ where: { PlayerId: player.id } });
      // Get all matches played by this player
      const matchIds = awards.map(a => a.MatchId);
      const matches = await Match.findAll({ where: { id: matchIds } });
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
        matches: matchDetails
      };
    }));
    res.json(performance);
  } catch (error) {
    console.error('Error fetching player performance:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;