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

// POST /api/results/finalizeMatches - finalize match day and update ratings
router.post('/finalizeMatches', async (req,res)=>{
  try {
    const { matchDayId } = req.body;
    if(!matchDayId) return res.status(400).json({error:'matchDayId required'});
    const result = await finalizeMatches(matchDayId);
    res.json(result);
  } catch(err){
    console.error('Finalize matches error:',err);
    res.status(500).json({error:'Failed to finalize matches'});
  }
});

// POST /api/results
router.post('/', async (req, res) => {
  const { matchId, winnerIds, score } = req.body;
  const result = await recordResult(matchId, winnerIds, score);
  res.json(result);
});

// PUT /api/results/:id - Update individual match result
router.put('/:id', async (req, res) => {
  try {
    const { recordResult } = require('../services/scheduler');
    const { Match, RatingAwards } = require('../models/Match');
    const matchId = req.params.id;
    const updateData = req.body;
    console.log('Updating match:', matchId, 'with data:', updateData);

    // Find the match
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Detect if teams have changed
    const oldTeam1 = match.team1 || [];
    const oldTeam2 = match.team2 || [];
    const newTeam1 = updateData.team1Players || oldTeam1;
    const newTeam2 = updateData.team2Players || oldTeam2;
    const teamsChanged = JSON.stringify(oldTeam1) !== JSON.stringify(newTeam1) || JSON.stringify(oldTeam2) !== JSON.stringify(newTeam2);

    // Update teams if provided
    if (updateData.team1Players && Array.isArray(updateData.team1Players) && updateData.team1Players.length > 0) {
      match.team1 = updateData.team1Players;
    }
    if (updateData.team2Players && Array.isArray(updateData.team2Players) && updateData.team2Players.length > 0) {
      match.team2 = updateData.team2Players;
    }
    if (updateData.score) {
      match.score = updateData.score;
    }
    // Winner/loser recalculation
    if (updateData.winnerTeam) {
      if (updateData.winnerTeam === 'team1') {
        match.winnerIds = match.team1;
        match.loserIds = match.team2;
      } else if (updateData.winnerTeam === 'team2') {
        match.winnerIds = match.team2;
        match.loserIds = match.team1;
      }
    }
    await match.save();

    // If teams changed, delete old RatingAwards and create new ones for new players
    if (teamsChanged) {
      await RatingAwards.destroy({ where: { MatchId: matchId } });
      // Create new RatingAwards for all players in both teams
      for (const pid of [...newTeam1, ...newTeam2]) {
        await RatingAwards.create({ MatchId: matchId, PlayerId: pid, Rating: 0 });
      }
    }

    // Prepare winnerIds for rating calculation
    let winnerIds = [];
    if (updateData.winnerTeam) {
      if (updateData.winnerTeam === 'team1') {
        winnerIds = newTeam1;
      } else if (updateData.winnerTeam === 'team2') {
        winnerIds = newTeam2;
      }
    } else if (match.winnerIds) {
      winnerIds = match.winnerIds;
    }
    const score = updateData.score || match.score;

    // If match has winner and score, recalculate ratings
    if (winnerIds && winnerIds.length > 0 && score) {
      await recordResult(matchId, winnerIds, score);
    }

    // Return the updated match
    const updatedMatch = await Match.findByPk(matchId);
    res.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match:', error);
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

// DELETE /api/results/:id - Delete match and associated rating awards
router.delete('/:id', async (req, res) => {
  try {
    const { Match, RatingAwards } = require('../models/Match');
    const matchId = req.params.id;
    
    // Find the match
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Delete associated RatingAwards first (foreign key constraint)
    await RatingAwards.destroy({ where: { MatchId: matchId } });
    
    // Delete the match
    await match.destroy();
    
    res.json({ message: 'Match and associated rating awards deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/results/match - Create a new match
router.post('/match', async (req, res) => {
  try {
    const { Match, RatingAwards } = require('../models/Match');
    const { matchCode, matchType, court, team1, team2, date, MatchDayId } = req.body;
    
    // Validation
    if (!matchCode || !matchType || !team1 || !team2 || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the match
    const match = await Match.create({
      matchCode,
      matchType,
      court: court || 1,
      team1,
      team2,
      date,
      MatchDayId: MatchDayId || null
    });
    
    // Create RatingAwards for all players
    const allPlayers = [...team1, ...team2];
    for (const playerId of allPlayers) {
      await RatingAwards.create({
        MatchId: match.id,
        PlayerId: playerId,
        Rating: 0
      });
    }
    
    res.status(201).json({ message: 'Match created successfully', match });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;