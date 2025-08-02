import React, { useEffect, useState } from 'react';
import './PlayerPerformanceMatrix.css';
import { api } from './utils/api';

// Accept reloadRef or onReloaded prop to allow parent to force a refetch
function PlayerPerformanceMatrix({ reloadRef, onReloaded }) {
  const [players, setPlayers] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Refetch logic
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPublicSnapshots();
      // Collect all unique dates from snapshots
      const allDates = Array.from(new Set(
        data.flatMap(p => p.snapshots.map(s => s.date))
      )).sort((a, b) => new Date(b) - new Date(a));
      setDates(allDates);
      setPlayers(data);
      // DEBUG: Output all player ratings received from backend
      console.log('DEBUG: Player ratings from backend:', data.map(p => ({ name: p.name, currentRating: p.currentRating })));
      if (typeof onReloaded === 'function') onReloaded();
    } catch (err) {
      setError('Failed to load player performance');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Expose reload method via ref
  React.useImperativeHandle(reloadRef, () => ({ reload: fetchData }), [fetchData]);

  // Helper: get rating for player at a given date
  function getRatingOnDate(player, date) {
    const snap = player.snapshots.find(s => s.date === date);
    return snap ? snap.rating : null;
  }

  

  if (loading) return <div className="matrix-loading">Loading...</div>;
  if (error) return <div className="matrix-error">{error}</div>;

  // Build list of all players (including absentees)
  const allPlayers = players.map(p => ({...p}));
  const playerCount = allPlayers.length;

  // Columns: Rank, Name, Current Rating, Dates..., Initial Rating
  const dateCols = dates; // already most recent left



  const sortedPlayers = [...players].sort((a, b) => b.currentRating - a.currentRating);

  return (
    <div className="matrix-container">
      <h2>Player Performance Leaderboard</h2>
      <div className="matrix-scroll">
        <table className="matrix-table leaderboard-view">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player Name</th>
              <th>Current Rating</th>
              {dateCols.map(date => (
                <th key={date}>{date}</th>
              ))}
              <th>Initial Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr key={player.id}>
                <td>{idx + 1}</td>
                <td>{player.name}</td>
                <td>{player.currentRating}</td>
                {dateCols.map((date, dIdx) => {
                  const ratingNow = getRatingOnDate(player, date);
                  // Compare with the next column to the right (older date) or initial rating if at last date
                  const nextRating = (dIdx + 1 < dateCols.length)
                    ? getRatingOnDate(player, dateCols[dIdx + 1])
                    : player.initialRating;
                  let cls = '';
                  if (ratingNow == null) {
                    cls = 'rating-absent';
                  } else if (nextRating == null) {
                    cls = 'rating-same';
                  } else if (ratingNow > nextRating) {
                    cls = 'rating-up';
                  } else if (ratingNow < nextRating) {
                    cls = 'rating-down';
                  } else {
                    cls = 'rating-same';
                  }
                  return <td key={date} className={cls}>{ratingNow ?? '-'}</td>;
                })}
                <td>{player.initialRating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerPerformanceMatrix;
