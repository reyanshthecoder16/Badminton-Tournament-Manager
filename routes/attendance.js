const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const MatchDay = require('../models/MatchDay');
const Attendance = require('../models/Attendance');

/**
 * @swagger
 * /api/attendance:
 *   put:
 *     summary: Bulk update attendance for all players for a match day
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     playerId:
 *                       type: integer
 *                     present:
 *                       type: boolean
 *                     date:
 *                       type: string
 *                       format: date
 *           example:
 *             attendance:
 *               - playerId: 1
 *                 present: true
 *                 date: "2025-07-12"
 *               - playerId: 2
 *                 present: false
 *                 date: "2025-07-12"
 *               - playerId: 3
 *                 present: true
 *                 date: "2025-07-12"
 *     responses:
 *       200:
 *         description: Attendance updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 * /api/attendance/{date}:
 *   get:
 *     summary: Get attendance for a match day
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-07-12"
 *         description: Date of the match day in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

router.put('/', async (req, res) => {
  const { attendance } = req.body; // array of { playerId, present, date }
  if (!Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({ error: 'Attendance array required' });
  }

  // Group by date
  const date = attendance[0].date;
  let matchDay = await MatchDay.findOne({ where: { date } });
  if (!matchDay) matchDay = await MatchDay.create({ date });

  // Remove previous attendance for this day
  await Attendance.destroy({ where: { MatchDayId: matchDay.id } });

  // Bulk create attendance
  const records = attendance.map(a => ({
    MatchDayId: matchDay.id,
    PlayerId: a.playerId,
    present: !!a.present
  }));
  try {
    await Attendance.bulkCreate(records);
    res.json({ success: true });
  } catch (err) {
    console.error('Attendance bulkCreate error:', err, records);
    res.status(500).json({ error: 'Failed to update attendance', details: err.message });
  }
});

// GET /api/attendance/:date
router.get('/:date', async (req, res) => {
  const { date } = req.params;
  const matchDay = await MatchDay.findOne({ where: { date } });
  if (!matchDay) return res.json([]);
  const attendance = await Attendance.findAll({ where: { MatchDayId: matchDay.id }, include: Player });
  res.json(attendance);
});

module.exports = router;