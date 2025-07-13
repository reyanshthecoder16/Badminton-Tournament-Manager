const express = require('express');
const router = express.Router();
const { recordResult, finalizeMatches } = require('../services/scheduler');

/**
 * @swagger
 * /api/results:
 *   post:
 *     summary: Record match result
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matchId:
 *                 type: integer
 *               winnerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               score:
 *                 type: string
 *     responses:
 *       200:
 *         description: Result recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 * 
 * /api/results/finalizeMatches:
 *   post:
 *     summary: Finalize tournament points and update player ratings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matchDayId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tournament points finalized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

// POST /api/results
router.post('/', async (req, res) => {
  const { matchId, winnerIds, score } = req.body;
  const result = await recordResult(matchId, winnerIds, score);
  res.json(result);
});

// POST /api/results/finalizeMatches
router.post('/finalizeMatches', async (req, res) => {
  try {
    const { matchDayId } = req.body;
    const result = await finalizeMatches(matchDayId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing matches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/results/matches
 * Returns all matches with their details and associated players
 */
router.get('/matches', async (req, res) => {
  const { Match } = require('../models/Match');
  const Player = require('../models/Player');
  try {
    const matches = await Match.findAll({
      order: [['date', 'DESC'], ['court', 'ASC'], ['matchCode', 'ASC']]
    });
    // For each match, fetch team1Players and team2Players
    const matchesWithTeams = await Promise.all(matches.map(async match => {
      const team1Players = match.team1 ? await Player.findAll({ where: { id: match.team1 } }) : [];
      const team2Players = match.team2 ? await Player.findAll({ where: { id: match.team2 } }) : [];
      return {
        ...match.toJSON(),
        team1Players,
        team2Players
      };
    }));
    res.json(matchesWithTeams);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;