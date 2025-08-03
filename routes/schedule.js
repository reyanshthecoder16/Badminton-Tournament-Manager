const express = require('express');
const router = express.Router();
const { generateSchedule } = require('../services/scheduler');
const MatchDay = require('../models/MatchDay');
const { Match } = require('../models/Match');
const Player = require('../models/Player');

/**
 * @swagger
 * /api/schedule:
 *   post:
 *     summary: Generate match schedule for a given date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Generated schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    var matchesExistsForDate = false;
    var matchDayExistsForDate = false;
    
    // Check if schedule already exists for this date
    const existingMatches = await Match.findOne({ where: { date } });
    if (existingMatches) {matchesExistsForDate = true
    }
    
    // Check if MatchDay exists for this date
    const existingMatchDay = await MatchDay.findOne({ where: { date } });
    if (existingMatchDay) {
      matchDayExistsForDate =true;
    }
    if(matchesExistsForDate && matchDayExistsForDate){
      return res.status(409).json({ 
        error: 'Schedule already exists for this date',
        alreadyGenerated: true 
      });
    }
    
    const schedule = await generateSchedule(date);
    res.json({ schedule, alreadyGenerated: false });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedule/check/:date - Check if schedule exists for date
router.get('/check/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Check if matches exist for this date
    const existingMatches = await Match.findOne({ where: { date } });
    // Check if MatchDay exists for this date
    console.log('existingMatches', existingMatches);
    const existingMatchDay = await MatchDay.findOne({ where: { date } });
    console.log('existingMatchDay', existingMatchDay);
    const alreadyGenerated = !!(existingMatches && existingMatchDay);
    
    res.json({ alreadyGenerated, date });
  } catch (error) {
    console.error('Error checking schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matchdays - return all match days (id, date)
router.get('/matchdays', async (req, res) => {
  try {
    const matchDays = await MatchDay.findAll({ order: [['date', 'DESC']] });
    res.json(matchDays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedule/:matchDayId - return all matches for a matchDayId grouped by court
router.get('/:matchDayId', async (req, res) => {
  const { matchDayId } = req.params;
  try {
    const matches = await Match.findAll({
      where: { MatchDayId: matchDayId },
      order: [['court', 'ASC'], ['id', 'ASC']]
    });
    // Group by court
    const courts = {};
    for (const match of matches) {
      if (!courts[match.court]) courts[match.court] = [];
      courts[match.court].push(match);
    }
    // Format as array of { court, matches: [...] } and resolve player names
    const result = await Promise.all(Object.entries(courts).map(async ([court, matches]) => {
      // Sort matches by id ascending (already sorted by query, but ensure here)
      matches.sort((a, b) => a.id - b.id);
      const formattedMatches = await Promise.all(matches.map(async match => {
        // Get player names for team1 and team2
        const team1Players = match.team1 ? await Player.findAll({ where: { id: match.team1 } }) : [];
        const team2Players = match.team2 ? await Player.findAll({ where: { id: match.team2 } }) : [];
        return {
          id: match.id,
          matchCode: match.matchCode,
          matchType: match.matchType,
          date: match.date,
          court: match.court,
          team1: match.team1,
          team2: match.team2,
          team1Players: team1Players,
          team2Players: team2Players,
          team1Names: team1Players.map(p => p.name),
          team2Names: team2Players.map(p => p.name),
          score: match.score || '',
          winnerIds: match.winnerIds,
          loserIds: match.loserIds
        };
      }));
      return { court, matches: formattedMatches };
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;