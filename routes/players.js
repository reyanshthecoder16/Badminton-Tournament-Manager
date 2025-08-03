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

/**
 * @swagger
 * /api/players:
 *   post:
 *     summary: Create a new player
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               initialRating:
 *                 type: integer
 *               currentRating:
 *                 type: integer
 *               joiningDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Player created successfully
 * /api/players/{id}:
 *   put:
 *     summary: Update a player
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Player updated successfully
 *   delete:
 *     summary: Delete a player
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player deleted successfully
 */

// POST /api/players - Create new player
router.post('/', async (req, res) => {
  try {
    const { name, gender, initialRating, currentRating, joiningDate } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Check if player with same name already exists
    const existingPlayer = await Player.findOne({ where: { name: name.trim() } });
    if (existingPlayer) {
      return res.status(409).json({ error: 'Player with this name already exists' });
    }
    
    const player = await Player.create({
      name: name.trim(),
      gender: gender || null,
      initialRating: initialRating || 1000,
      currentRating: currentRating || initialRating || 1000,
      joiningDate: joiningDate || new Date(),
      lastRatingUpdatedOn: new Date()
    });
    
    res.status(201).json(player);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// PUT /api/players/:id - Update player
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, initialRating, currentRating, joiningDate } = req.body;
    
    const player = await Player.findByPk(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Check if another player with same name exists
    const existingPlayer = await Player.findOne({ 
      where: { 
        name: name.trim(),
        id: { [require('sequelize').Op.ne]: id }
      } 
    });
    if (existingPlayer) {
      return res.status(409).json({ error: 'Another player with this name already exists' });
    }
    
    // Check if player has match history to restrict certain field updates
    const { RatingAwards } = require('../models/Match');
    const hasMatches = await RatingAwards.findOne({ where: { PlayerId: id } });
    
    const updateData = {
      name: name.trim(),
      gender: gender || player.gender,
      lastRatingUpdatedOn: new Date()
    };
    
    // Only allow rating and date changes if player has no match history
    if (!hasMatches) {
      if (initialRating !== undefined) updateData.initialRating = initialRating;
      if (currentRating !== undefined) updateData.currentRating = currentRating;
      if (joiningDate) updateData.joiningDate = joiningDate;
    }
    
    await player.update(updateData);
    
    res.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// GET /api/players/:id/matches - Check if player has match history
router.get('/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await Player.findByPk(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if player has any match history (RatingAwards)
    const { RatingAwards } = require('../models/Match');
    const hasMatches = await RatingAwards.findOne({ where: { PlayerId: id } });
    
    res.json(!!hasMatches);
  } catch (error) {
    console.error('Error checking player matches:', error);
    res.status(500).json({ error: 'Failed to check player matches' });
  }
});

// DELETE /api/players/:id - Delete player
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await Player.findByPk(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if player has any match history (RatingAwards)
    const { RatingAwards } = require('../models/Match');
    const hasMatches = await RatingAwards.findOne({ where: { PlayerId: id } });
    
    if (hasMatches) {
      return res.status(409).json({ 
        error: 'Cannot delete player with match history.' 
      });
    }
    
    await player.destroy();
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;