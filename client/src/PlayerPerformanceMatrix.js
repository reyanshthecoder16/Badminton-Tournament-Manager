import React, { useEffect, useState } from 'react';
import './PlayerPerformanceMatrix.css';
import { api } from './utils/api';

function PlayerPerformanceMatrix({ view, setView }) {
  const [players, setPlayers] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getPublicPerformance();
        // Collect all unique dates from all matches
        const allDates = Array.from(new Set(
          data.flatMap(p => p.matches.map(m => m.date && m.date.slice(0, 10)))
        )).filter(Boolean).sort();
        setDates(allDates);
        setPlayers(data);
      } catch (err) {
        setError('Failed to load player performance');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Helper: get rating for player at a given date
  function getRatingOnDate(player, date) {
    // Find the match played on this date
    const match = player.matches.find(m => m.date && m.date.slice(0, 10) === date);
    if (match) {
      // Assume rating after this match is initialRating + sum(points up to and including this match)
      let rating = player.initialRating;
      const sortedMatches = player.matches.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      for (const m of sortedMatches) {
        if (m.date && m.date.slice(0, 10) <= date) {
          rating += m.points;
        }
        if (m.date && m.date.slice(0, 10) === date) break;
      }
      return rating;
    }
    // If no match, return null
    return null;
  }

  // Helper: get trend for player at a given date
  // Use parent view and setView for SPA navigation
  const selectedTab = (view === 'matrix') ? 'leaderboard' : (view === 'performance' ? 'detailed' : (view === 'admin' ? 'admin' : ''));
  // setView comes from props
  // Remove local useState

  function getTrend(player, date, prevDate) {
    const ratingNow = getRatingOnDate(player, date);
    const ratingPrev = prevDate ? getRatingOnDate(player, prevDate) : null;
    if (ratingNow == null) return 'none';
    if (ratingPrev == null) return 'none';
    if (ratingNow > ratingPrev) return 'up';
    if (ratingNow < ratingPrev) return 'down';
    return 'same';
  }

  if (loading) return <div className="matrix-loading">Loading...</div>;
  if (error) return <div className="matrix-error">{error}</div>;

  // Build list of all players (including absentees)
  const allPlayers = players.map(p => ({...p}));
  const playerCount = allPlayers.length;

  // Build all date columns: include only 'Initial' as the first column, then match dates
  const allDateCols = ['Initial', ...dates];

  // For each date, get player ratings as of that date, then sort by rating desc
  function getRatingsForDate(date) {
    return allPlayers.map(player => {
      let rating;
      if (date === 'Initial') {
        rating = player.initialRating;
      } else {
        rating = getRatingOnDate(player, date);
        if (rating === null) rating = player.initialRating;
      }
      return { ...player, rating };
    }).sort((a, b) => b.rating - a.rating);
  }

  // For each date, build a ranking map: rank (0-based) -> player
  const rankingsByDate = {};
  allDateCols.forEach(date => {
    rankingsByDate[date] = getRatingsForDate(date);
  });

  // For coloring consistently: assign each player a color index based on their id sorted alphabetically
  const playerIdToColorIdx = (() => {
    const sorted = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));
    const map = {};
    sorted.forEach((p, idx) => { map[p.id] = idx % 12; });
    return map;
  })();

  // For each rank (row), build the row: rank, player name (initial), then for each date, the player at that rank
  const rows = [];
  // If there are no match dates, do not render rows
  if (allDateCols.length > 0) {
    for (let rank = 0; rank < playerCount; rank++) {
      // For Rank and Name columns, use the player's info from the first date's ranking
      const firstDate = allDateCols[0];
      const playerInfo = rankingsByDate[firstDate]?.[rank];
      rows.push({
        rank: rank + 1,
        player: playerInfo,
        cells: allDateCols.map((date, colIdx) => {
          if (date === 'Initial') {
            // Use player info from 'Initial' ranking
            const initialPlayer = rankingsByDate['Initial']?.[rank];
            return initialPlayer ? initialPlayer : null;
          } else {
            const playerAtRank = rankingsByDate[date]?.[rank];
            if (!playerAtRank) return null;
            return playerAtRank;
          }
        })
      });
    }
  }

  return (
    <div className="matrix-container">
      <div className="matrix-header-app">
        <h1 className="matrix-app-title">Badminton Tournament Manager</h1>
      </div>
      <div className="matrix-nav" style={{display:'flex',gap:16,marginBottom:24}}>
        <button className={`matrix-nav-btn${selectedTab==='leaderboard' ? ' selected' : ''}`} onClick={()=>setView('matrix')}>Leaderboard</button>
        <button className={`matrix-nav-btn${selectedTab==='admin' ? ' selected' : ''}`} onClick={()=>setView('admin')}>Admin Page</button>
        <button className={`matrix-nav-btn${selectedTab==='detailed' ? ' selected' : ''}`} onClick={()=>setView('performance')}>Detailed Player Performance</button>
      </div>
      <h2>Player Performance Leaderboard</h2>
      <div className="matrix-scroll">
        <table className="matrix-table leaderboard-view">
          <thead>
            <tr>
              <th className="sticky-col">Rank</th>
              {allDateCols.map(date => (
                <th key={date}>{date === 'Initial' ? 'Initial Rating' : date}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.rank}>
                <td className="sticky-col">{row.rank}</td>
                {row.cells.map((cellPlayer, colIdx) => {
                  let trend = 'none';
                  if (colIdx === 0) {
                    trend = 'none'; // Initial column
                  } else if (cellPlayer) {
                    const prevPlayer = rankingsByDate[allDateCols[colIdx - 1]][row.rank - 1];
                    if (prevPlayer && cellPlayer.rating > prevPlayer.rating) trend = 'up';
                    else if (prevPlayer && cellPlayer.rating < prevPlayer.rating) trend = 'down';
                    else if (prevPlayer && cellPlayer.rating === prevPlayer.rating) trend = 'same';
                  }
                  return (
                    <td key={colIdx} className={`matrix-cell trend-${trend} player-color-${playerIdToColorIdx[cellPlayer?.id]}`}>{cellPlayer ? `${cellPlayer.name} (${cellPlayer.rating})` : '-'}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerPerformanceMatrix;
