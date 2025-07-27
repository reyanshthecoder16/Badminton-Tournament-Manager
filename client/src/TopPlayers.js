import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import './TopPlayers.css';

function TopPlayers() {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatchDays = async () => {
      try {
                const data = await api.getPublicMatchDays();
        setMatchDays(data);
        if (data.length > 0) {
          setSelectedMatchDay(data[0].match_day);
        }
      } catch (err) {
        setError('Failed to load match days.');
      }
    };
    fetchMatchDays();
  }, []);

  useEffect(() => {
    if (selectedMatchDay) {
      const fetchTopPlayers = async () => {
        setLoading(true);
        setError('');
        try {
                    const data = await api.getTopPlayersByRatingChange(selectedMatchDay);
          setTopPlayers(data);
        } catch (err) {
          setError('Failed to load top players.');
          setTopPlayers([]);
        } finally {
          setLoading(false);
        }
      };
      fetchTopPlayers();
    }
  }, [selectedMatchDay]);

  return (
    <div className="top-players-container">
      <h2>Top 10 Players by Rating Change</h2>
      <div className="controls">
        <label htmlFor="match-day-select">Select Match Day:</label>
        <select 
          id="match-day-select"
          value={selectedMatchDay}
          onChange={(e) => setSelectedMatchDay(e.target.value)}
        >
          {matchDays.map(day => (
            <option key={day.match_day} value={day.match_day}>
              {new Date(day.match_day).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && topPlayers.length > 0 && (
        <div className="players-list">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Rating Change</th>
                <th>New Rating</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((player, index) => (
                <tr key={player.player_id}>
                  <td>{index + 1}</td>
                  <td>{player.name}</td>
                  <td className={player.rating_change >= 0 ? 'positive' : 'negative'}>
                    {typeof player.rating_change === 'number' && !isNaN(player.rating_change)
                      ? `${player.rating_change > 0 ? '+' : ''}${player.rating_change.toFixed(2)}`
                      : '-'}
                  </td>
                  <td>{typeof player.new_rating === 'number' && !isNaN(player.new_rating)
                    ? player.new_rating.toFixed(2)
                    : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && topPlayers.length === 0 && selectedMatchDay && (
        <p>No player data available for this day.</p>
      )}
    </div>
  );
}

export default TopPlayers;
