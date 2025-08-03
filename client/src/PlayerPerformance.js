import React, { useEffect, useState } from 'react';
import { api } from './utils/api';

function PlayerPerformance() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPlayerPerformance();
      setPlayers(data);
    } catch (err) {
      setError('Failed to fetch player performance');
    }
    setLoading(false);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="loader">Loading player performance...</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  if (!players.length) return <div>No players found.</div>;

  // 1. Collect all unique match dates from all players' matches
  const allDatesSet = new Set();
  players.forEach(player => {
    player.matches.forEach(m => {
      if (m.date) allDatesSet.add(m.date.slice(0, 10));
    });
  });
  const allDates = Array.from(allDatesSet).sort((a, b) => new Date(b) - new Date(a)); // most recent left

  // 2. Sort players by currentRating descending
  const sortedPlayers = [...players].sort((a, b) => b.currentRating - a.currentRating);

  // 2b. Build a map of playerId -> rank based on overall rating order
  const rankById = {};
  sortedPlayers.forEach((p, index) => {
    rankById[p.id] = index + 1;
  });

  // 3. Helper to compute rating as of a date
  function getRatingOnDate(player, date) {
    let rating = player.initialRating;
    // Sort matches chronologically
    const matches = player.matches.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const m of matches) {
      if (m.date && m.date.slice(0, 10) <= date) {
        rating += m.points;
      }
      if (m.date && m.date.slice(0, 10) === date) break;
    }
    return rating;
  }

  return (
    <div className="performance-container">
      <h2>Player Performance</h2>
      <table className="performance-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Current Rating</th>
            {allDates.map(date => (
              <th key={date}>{date}</th>
            ))}
            <th>Initial Rating</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.id}>
              <td>{rankById[player.id]}</td>
              <td>{player.name}</td>
              <td>{player.currentRating}</td>
              {allDates.map(date => (
                <td key={date}>{getRatingOnDate(player, date)}</td>
              ))}
              <td>{player.initialRating}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        .performance-container {
          max-width: 900px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 32px 24px 24px 24px;
        }
        .performance-container h2 {
          text-align: center;
          margin-bottom: 24px;
        }
        .performance-table {
          width: 100%;
          border-collapse: collapse;
          background: #fafcff;
        }
        .performance-table th, .performance-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 10px;
          text-align: center;
        }
        .performance-table th {
          background: #e6f7ff;
        }
        .expand-btn {
          background: #f0f0f0;
          border: 1px solid #b3e6ff;
          border-radius: 4px;
          padding: 2px 10px;
          font-size: 1.1rem;
          cursor: pointer;
        }
        .match-detail-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .match-detail-table th, .match-detail-table td {
          border: 1px solid #e0e0e0;
          padding: 6px 8px;
          text-align: center;
        }
        .match-detail-table th {
          background: #f0f8ff;
        }
        .loader {
          text-align: center;
          font-size: 1.2rem;
          margin-top: 40px;
        }
      `}</style>
    </div>
  );
}

export default PlayerPerformance; 