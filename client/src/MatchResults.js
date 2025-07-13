import React, { useEffect, useState } from 'react';

function defaultMultiSort(a, b) {
  const dateA = a.date || '';
  const dateB = b.date || '';
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  const courtA = a.court || 0;
  const courtB = b.court || 0;
  if (courtA < courtB) return -1;
  if (courtA > courtB) return 1;
  const idA = a.id || 0;
  const idB = b.id || 0;
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
}

function MatchResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [inputs, setInputs] = useState({});
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [changed, setChanged] = useState({}); // Track changed matches
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/results/matches');
      const data = await res.json();
      setMatches(data);
      const initialInputs = {};
      data.forEach(match => {
        initialInputs[match.id] = {
          winnerTeam: getWinnerTeam(match),
          scoreInput: match.score || ''
        };
      });
      setInputs(initialInputs);
      setChanged({});
    } catch (err) {
      setError('Failed to fetch matches');
    }
    setLoading(false);
  };

  function getWinnerTeam(match) {
    if (!match.winnerIds || match.winnerIds.length === 0) return '';
    const winnerIds = match.winnerIds.sort().join(',');
    if ((match.team1Players || []).map(p => p.id).sort().join(',') === winnerIds) return 'team1';
    if ((match.team2Players || []).map(p => p.id).sort().join(',') === winnerIds) return 'team2';
    return '';
  }

  const handleInputChange = (matchId, field, value) => {
    setInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
    setChanged(prev => ({ ...prev, [matchId]: true }));
  };

  const handleUpdate = async (matchId, match) => {
    setUpdating(prev => ({ ...prev, [matchId]: true }));
    const { winnerTeam, scoreInput } = inputs[matchId];
    let winnerIds = [];
    if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
    else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winnerIds, score: scoreInput })
      });
      await fetchMatches();
      alert('Result updated!');
    } catch (err) {
      alert('Failed to update result');
    }
    setUpdating(prev => ({ ...prev, [matchId]: false }));
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    const updates = Object.keys(changed).map(matchId => {
      const match = matches.find(m => m.id === Number(matchId));
      const { winnerTeam, scoreInput } = inputs[matchId];
      let winnerIds = [];
      if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
      else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
      return { matchId: Number(matchId), winnerIds, score: scoreInput };
    });
    try {
      await Promise.all(updates.map(update =>
        fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      ));
      await fetchMatches();
      alert('All selected results updated!');
    } catch (err) {
      alert('Failed to update some results');
    }
    setBulkUpdating(false);
  };

  const handleForceBulkUpdate = async () => {
    setBulkUpdating(true);
    const updates = matches.map(match => {
      const { winnerTeam, scoreInput } = inputs[match.id];
      let winnerIds = [];
      if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
      else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
      return { matchId: match.id, winnerIds, score: scoreInput };
    });
    try {
      await Promise.all(updates.map(update =>
        fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      ));
      await fetchMatches();
      alert('All records force updated!');
    } catch (err) {
      alert('Failed to force update some results');
    }
    setBulkUpdating(false);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  function getSortedMatches() {
    const sorted = [...matches];
    if (!sortBy) {
      sorted.sort(defaultMultiSort);
      return sorted;
    }
    sorted.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'date') {
        valA = a.date || '';
        valB = b.date || '';
      } else if (sortBy === 'court') {
        valA = a.court || 0;
        valB = b.court || 0;
      } else if (sortBy === 'matchCode') {
        valA = a.matchCode || '';
        valB = b.matchCode || '';
      } else if (sortBy === 'id') {
        valA = a.id || 0;
        valB = b.id || 0;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  if (loading) return <div className="loader">Loading matches...</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  if (!matches.length) return <div>No matches found.</div>;

  return (
    <div className="match-results-container">
      <h2>Update Match Results</h2>
      <div className="sort-controls">
        <span>Sort by: </span>
        <button className={sortBy==='date' ? 'active' : ''} onClick={() => handleSort('date')}>Date {sortBy==='date' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='court' ? 'active' : ''} onClick={() => handleSort('court')}>Court {sortBy==='court' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='id' ? 'active' : ''} onClick={() => handleSort('id')}>ID {sortBy==='id' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='matchCode' ? 'active' : ''} onClick={() => handleSort('matchCode')}>Match {sortBy==='matchCode' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        {sortBy && <button style={{marginLeft:8}} onClick={()=>setSortBy('')}>Reset</button>}
      </div>
      <button
        className="update-btn"
        style={{marginBottom:16, float:'right'}}
        onClick={handleBulkUpdate}
        disabled={bulkUpdating || Object.keys(changed).length === 0}
      >
        {bulkUpdating ? 'Updating All...' : `Update All (${Object.keys(changed).length})`}
      </button>
      <button
        className="update-btn"
        style={{marginBottom:16, float:'right', marginRight:12, background:'#ffb347', color:'#222'}}
        onClick={handleForceBulkUpdate}
        disabled={bulkUpdating}
      >
        {bulkUpdating ? 'Force Updating...' : 'Force Update All'}
      </button>
      <table className="match-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Court</th>
            <th>Code</th>
            <th>Type</th>
            <th colSpan={2}>Teams</th>
            <th>Winner</th>
            <th>Score</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          {getSortedMatches().map(match => {
            const team1 = match.team1Players || [];
            const team2 = match.team2Players || [];
            return (
              <tr key={match.id}>
                <td>{match.id}</td>
                <td>{match.date ? match.date.slice(0, 10) : ''}</td>
                <td>{match.court || ''}</td>
                <td>{match.matchCode || ''}</td>
                <td>{match.matchType || ''}</td>
                <td>
                  <b>Team 1</b>
                  <ul style={{margin:0,paddingLeft:16}}>
                    {team1.map(p => <li key={p.id}>{p.name} (ID: {p.id})</li>)}
                  </ul>
                </td>
                <td>
                  <b>Team 2</b>
                  <ul style={{margin:0,paddingLeft:16}}>
                    {team2.map(p => <li key={p.id}>{p.name} (ID: {p.id})</li>)}
                  </ul>
                </td>
                <td>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <button
                      className={inputs[match.id]?.winnerTeam==='team1'?'winner-btn selected':'winner-btn'}
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team1')}
                    >Team 1</button>
                    <button
                      className={inputs[match.id]?.winnerTeam==='team2'?'winner-btn selected':'winner-btn'}
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team2')}
                    >Team 2</button>
                  </div>
                </td>
                <td>
                  <input
                    className="score-input"
                    type="text"
                    value={inputs[match.id]?.scoreInput || ''}
                    onChange={e => handleInputChange(match.id, 'scoreInput', e.target.value)}
                    placeholder="Score"
                  />
                </td>
                <td>
                  <button
                    className="update-btn"
                    onClick={() => handleUpdate(match.id, match)}
                    disabled={updating[match.id]}
                  >
                    {updating[match.id] ? 'Updating...' : 'Update'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style>{`
        .match-results-container {
          max-width: 1100px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 32px 24px 24px 24px;
        }
        .match-results-container h2 {
          text-align: center;
          margin-bottom: 24px;
        }
        .sort-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          justify-content: center;
        }
        .sort-controls button {
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          padding: 6px 14px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sort-controls button.active, .sort-controls button:hover {
          background: #b3e6ff;
        }
        .match-table {
          width: 100%;
          border-collapse: collapse;
          background: #fafcff;
        }
        .match-table th, .match-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 10px;
          text-align: center;
        }
        .match-table th {
          background: #e6f7ff;
        }
        .winner-btn {
          background: #f0f0f0;
          border: 1px solid #b3e6b3;
          border-radius: 4px;
          padding: 4px 10px;
          margin: 2px 0;
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
        }
        .winner-btn.selected {
          background: #b3e6b3;
          border: 2px solid #4caf50;
        }
        .score-input {
          width: 70px;
          padding: 4px 6px;
          border-radius: 4px;
          border: 1px solid #b3e6ff;
        }
        .update-btn {
          background: #4caf50;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 6px 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .update-btn:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
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

export default MatchResults;