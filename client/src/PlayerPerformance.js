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

  return (
    <div className="performance-container">
      <h2>Player Performance</h2>
      <table className="performance-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Initial Rating</th>
            <th>Current Rating</th>
            <th>Total Points</th>
            <th>Last Rating Updated</th>
            <th>Matches Played</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <React.Fragment key={player.id}>
              <tr>
                <td>
                  <button className="expand-btn" onClick={() => toggleExpand(player.id)}>
                    {expanded[player.id] ? '-' : '+'}
                  </button>
                </td>
                <td>{player.name}</td>
                <td>{player.initialRating}</td>
                <td>{player.currentRating}</td>
                <td>{player.totalPoints}</td>
                <td>{player.lastRatingUpdatedOn ? new Date(player.lastRatingUpdatedOn).toLocaleString() : '—'}</td>
                <td>{player.matches.length}</td>
              </tr>
              {expanded[player.id] && (
                <tr>
                  <td colSpan={6}>
                    <table className="match-detail-table">
                      <thead>
                        <tr>
                          <th>Match ID</th>
                          <th>Date</th>
                          <th>Code</th>
                          <th>Court</th>
                          <th>Score</th>
                          <th>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {player.matches.map(m => (
                          <tr key={m.matchId}>
                            <td>{m.matchId}</td>
                            <td>{m.date ? m.date.slice(0,10) : ''}</td>
                            <td>{m.matchCode}</td>
                            <td>{m.court}</td>
                            <td>{m.score}</td>
                            <td>{m.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
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