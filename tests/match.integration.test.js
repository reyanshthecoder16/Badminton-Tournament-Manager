// Integration tests for match creation, update, player update, score update, and rating consistency
const request = require('supertest');
const app = require('../index'); // Express app
const { Match, RatingAwards, Player, MatchDay } = require('../models/Match');
const db = require('../config/db');

describe('Match & RatingAwards Integration', () => {
  let matchDay, player1, player2, player3, player4, matchId;

  beforeAll(async () => {
    await db.sync({ force: true });
    player1 = await Player.create({ name: 'P1' });
    player2 = await Player.create({ name: 'P2' });
    player3 = await Player.create({ name: 'P3' });
    player4 = await Player.create({ name: 'P4' });
    matchDay = await MatchDay.create({ date: new Date() });
  });

  it('should add a match', async () => {
    const res = await request(app)
      .post('/api/public/matches')
      .send({
        matchCode: 'M1',
        matchType: 'Singles',
        date: new Date(),
        court: 1,
        team1: [player1.id],
        team2: [player2.id],
        MatchDayId: matchDay.id
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.matchCode).toBe('M1');
    matchId = res.body.id;
  });

  it('should update match players', async () => {
    const match = await Match.findByPk(matchId);
    match.team1 = [player3.id];
    match.team2 = [player4.id];
    await match.save();
    const updated = await Match.findByPk(matchId);
    expect(updated.team1[0]).toBe(player3.id);
    expect(updated.team2[0]).toBe(player4.id);
  });

  it('should update match score', async () => {
    const match = await Match.findByPk(matchId);
    match.score = '21-15';
    await match.save();
    const updated = await Match.findByPk(matchId);
    expect(updated.score).toBe('21-15');
  });

  it('should record result and update ratings', async () => {
    // Simulate result API (assuming /api/results)
    const res = await request(app)
      .post('/api/results')
      .send({ matchId, winnerIds: [player3.id], score: '21-15' });
    expect(res.statusCode).toBe(200);
    // Check RatingAwards
    const awards = await RatingAwards.findAll({ where: { MatchId: matchId } });
    expect(awards.length).toBeGreaterThan(0);
    // Check consistency
    const match = await Match.findByPk(matchId);
    expect(match.score).toBe('21-15');
  });

  afterAll(async () => {
    await db.close();
  });
});
