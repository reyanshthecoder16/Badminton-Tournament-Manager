import React, { useEffect, useState } from 'react';
import { api } from './utils/api';
import PlayerSelector from './PlayerSelector';

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
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [manualMatches, setManualMatches] = useState([]); // persistent frontend-only matches
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [inputs, setInputs] = useState({});
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [changed, setChanged] = useState({}); // Track changed matches
  const [bulkUpdating, setBulkUpdating] = useState(false);
  // State for match days and filter
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [finalizedDays, setFinalizedDays] = useState([]);
  // New: modal and localTeams state
  const [editModal, setEditModal] = useState({ matchId: null, team: null });
  const [localTeams, setLocalTeams] = useState({});
  // Manual match modal and state
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchCode: '',
    matchType: '',
    team1: [],
    team2: [],
    date: '',
    court: '',
  });

  // Load manual matches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('manualMatches');
    if (stored) {
      try {
        setManualMatches(JSON.parse(stored));
      } catch {}
    }
  }, []);
  // Save manual matches to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('manualMatches', JSON.stringify(manualMatches));
  }, [manualMatches]);
  // Fetch match days and finalized days on mount
  useEffect(() => {
    const fetchMatchDays = async () => {
      try {
        const days = await api.getMatchDays();
        setMatchDays(days);
        if (days.length > 0) {
          // Sort by date to ensure latest is selected (assuming date field exists)
          const sortedDays = [...days].sort((a, b) => new Date(a.date) - new Date(b.date));
          const latest = sortedDays[sortedDays.length - 1].id;
          setSelectedMatchDay(latest);
          console.log('Match days:', days);
          console.log('Selected latest match day:', latest);
        }
      } catch {
        setError('Failed to load match days');
      }
    };
    fetchMatchDays();
  }, []);

  // Fetch matches when selectedMatchDay changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedMatchDay) return;
    fetchMatches(selectedMatchDay);
  }, [selectedMatchDay]);

  // Update finalizedDays when matchDays changes
  useEffect(() => {
    if (!matchDays.length) return;
    const finalized = matchDays.filter(d => d.finalized).map(d => d.id);
    setFinalizedDays(finalized);
    console.log('Finalized days:', finalized);
    console.log('All match days with finalized status:', matchDays.map(d => ({id: d.id, date: d.date, finalized: d.finalized})));
  }, [matchDays]);

  const fetchMatches = async (matchDayId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMatches();
      // Filter matches to selected match day (loose equality for type safety, correct field)
      const filtered = data.filter(m => m.MatchDayId == matchDayId);
      // Merge manual matches for this day
      const manualForDay = manualMatches.filter(m => m.MatchDayId == matchDayId);
      setMatches([...manualForDay, ...filtered]);
      const initialInputs = {};
      const initialLocalTeams = {};
      filtered.forEach(match => {
        initialInputs[match.id] = {
          winnerTeam: getWinnerTeam(match),
          scoreInput: match.score || '',
          team1Players: (match.team1Players || []).map(p => p.id),
          team2Players: (match.team2Players || []).map(p => p.id),
        };
        initialLocalTeams[match.id] = {
          team1: (match.team1Players || []).map(p => p.id),
          team2: (match.team2Players || []).map(p => p.id),
        };
      });
      setInputs(initialInputs);
      setLocalTeams(initialLocalTeams);
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
    if (finalizedDays.includes(Number(selectedMatchDay))) {
      alert('This match day is finalized. Updates are not allowed.');
      return;
    }
    // Validation: teams must have at least one player, no overlap
    const team1 = (inputs[matchId]?.team1Players || match.team1Players || []).map(p => p.id || p);
    const team2 = (inputs[matchId]?.team2Players || match.team2Players || []).map(p => p.id || p);
    if (team1.length === 0 || team2.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }
    if (team1.some(id => team2.includes(id))) {
      alert('Players must not be on both teams.');
      return;
    }
    setUpdating(prev => ({ ...prev, [matchId]: true }));
    const { winnerTeam, scoreInput } = inputs[matchId];
    let winnerIds = [];
    if (winnerTeam === 'team1') winnerIds = team1;
    else if (winnerTeam === 'team2') winnerIds = team2;
    try {
      await api.createResult({ matchId, winnerIds, score: scoreInput });
      await fetchMatches(selectedMatchDay);
      alert('Result updated!');
    } catch (err) {
      alert('Failed to update result');
    }
    setUpdating(prev => ({ ...prev, [matchId]: false }));
  };


  const handleBulkUpdate = async () => {
    console.log('handleBulkUpdate called - selectedMatchDay:', selectedMatchDay, 'finalizedDays:', finalizedDays);
    if (finalizedDays.includes(Number(selectedMatchDay))) {
      alert('This match day is finalized. Bulk updates are not allowed.');
      return;
    }
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
      for (const update of updates) {
        try {
          await api.createResult(update);
          await new Promise(res => setTimeout(res, 100)); // 100ms delay, backend limit increased
        } catch (err) {
          let backendMsg = '';
          if (err && err.message) backendMsg = err.message;
          if (err && err.response && typeof err.response.text === 'function') {
            try {
              backendMsg = await err.response.text();
            } catch {}
          }
          console.error('Failed to update result for matchId', update.matchId, backendMsg || err);
          throw err;
        }
      }
      await fetchMatches(selectedMatchDay);
      alert('All selected results updated!');
    } catch (err) {
      alert('Failed to update some results. See console for details.');
      console.error('Bulk update error:', err);
    }
    setBulkUpdating(false);
  };

  const handleForceBulkUpdate = async () => {
    console.log('handleForceBulkUpdate called - selectedMatchDay:', selectedMatchDay, 'finalizedDays:', finalizedDays);
    if (finalizedDays.includes(Number(selectedMatchDay))) {
      alert('This match day is finalized. Force updates are not allowed.');
      return;
    }
    setBulkUpdating(true);
    const updates = matches.map(match => {
      const { winnerTeam, scoreInput } = inputs[match.id];
      let winnerIds = [];
      if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
      if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
      return { matchId: match.id, winnerIds, score: scoreInput };
    });
    try {
      await Promise.all(updates.map(update => api.createResult(update)));
      await fetchMatches(selectedMatchDay);
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
      <button className="add-match-btn" onClick={() => { setAddMatchModal(true); setValidationError(''); }} style={{marginBottom:16, float:'right', background:'#1976d2', color:'#fff', borderRadius:8, padding:'8px 18px', fontWeight:600, border:'none', boxShadow:'0 2px 8px #b0c4de55', cursor:'pointer'}}>+ Add Match </button>
      {addMatchModal && (
        <div className="modal-bg" onClick={() => setAddMatchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:480}}>
            <h3> (Frontend Only)</h3>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {/* Dropdown for Match Code */}
              <select value={newMatch.matchCode} onChange={e => setNewMatch(m => ({...m, matchCode:e.target.value}))}>
                <option value="">Select Match Code</option>
                {[...new Set(matches.map(m => m.matchCode).filter(Boolean))].map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
                <option value="__custom">Other (Enter manually)</option>
              </select>
              {newMatch.matchCode === "__custom" && (
                <input autoFocus placeholder="Enter Match Code" value={newMatch.customMatchCode || ''} onChange={e => setNewMatch(m => ({...m, customMatchCode:e.target.value}))} />
              )}
              {/* Dropdown for Match Type */}
              <select value={newMatch.matchType} onChange={e => setNewMatch(m => ({...m, matchType:e.target.value}))}>
                <option value="">Select Match Type</option>
                {[...new Set(matches.map(m => m.matchType).filter(Boolean))].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value="__custom">Other (Enter manually)</option>
              </select>
              {newMatch.matchType === "__custom" && (
                <input autoFocus placeholder="Enter Match Type" value={newMatch.customMatchType || ''} onChange={e => setNewMatch(m => ({...m, customMatchType:e.target.value}))} />
              )}

              <input type="date" value={newMatch.date} onChange={e => setNewMatch(m => ({...m, date:e.target.value}))} />
              <input placeholder="Court" value={newMatch.court} onChange={e => setNewMatch(m => ({...m, court:e.target.value}))} />
              <div><b>Team 1</b>
                <PlayerSelector players={players} selected={newMatch.team1} onChange={ids => setNewMatch(m => ({...m, team1:ids}))} max={2} label="Select Team 1 Players" />
              </div>
              <div><b>Team 2</b>
                <PlayerSelector players={players} selected={newMatch.team2} onChange={ids => setNewMatch(m => ({...m, team2:ids}))} max={2} label="Select Team 2 Players" />
              </div>
              {validationError && <div style={{color:'red',margin:'6px 0'}}>{validationError}</div>}
              <div style={{display:'flex', gap:10, marginTop:10}}>
                <button className="update-btn" onClick={() => setAddMatchModal(false)}>Cancel</button>
                <button className="update-btn" style={{background:'#1976d2', color:'#fff'}} onClick={() => {
                  // Validation
                  let matchCodeToSave = newMatch.matchCode === "__custom" ? (newMatch.customMatchCode || '').trim() : (newMatch.matchCode || '').trim();
                  let matchTypeToSave = newMatch.matchType === "__custom" ? (newMatch.customMatchType || '').trim() : (newMatch.matchType || '').trim();
                  if (!matchCodeToSave || !matchTypeToSave || !newMatch.date || !newMatch.court.trim()) {
                    setValidationError('All fields are required.'); return;
                  }
                  if (newMatch.team1.length === 0 || newMatch.team2.length === 0) {
                    setValidationError('Both teams must have at least one player.'); return;
                  }
                  if (newMatch.team1.some(id => newMatch.team2.includes(id))) {
                    setValidationError('Players must not be on both teams.'); return;
                  }
                  // Try to save match to backend
                  api.createMatch({
                    matchCode: matchCodeToSave,
                    matchType: matchTypeToSave,
                    date: newMatch.date,
                    court: newMatch.court,
                    team1: newMatch.team1,
                    team2: newMatch.team2,
                    MatchDayId: selectedMatchDay
                  }).then(() => {
                    setAddMatchModal(false);
                    setNewMatch({matchCode:'',matchType:'',team1:[],team2:[],date:'',court:''});
                    setValidationError('');
                    fetchMatches(selectedMatchDay);
                  }).catch(err => {
                    // fallback to manual/local if backend fails
                    const allIds = [
                      ...matches.map(m => typeof m.id === 'number' ? m.id : Number(m.id)),
                      ...manualMatches.map(m => typeof m.id === 'number' ? m.id : Number(m.id)),
                    ].filter(n => !isNaN(n));
                    const nextId = allIds.length ? Math.max(...allIds) + 1 : 1;
                    const manualMatch = {
                      id: nextId,
                      matchCode: matchCodeToSave,
                      matchType: matchTypeToSave,
                      date: newMatch.date,
                      court: newMatch.court,
                      team1Players: newMatch.team1.map(pid => players.find(p => p.id === pid)),
                      team2Players: newMatch.team2.map(pid => players.find(p => p.id === pid)),
                      isManual: true,
                      MatchDayId: selectedMatchDay,
                    };
                    setManualMatches(prev => [manualMatch, ...prev]);
                    setAddMatchModal(false);
                    setNewMatch({matchCode:'',matchType:'',team1:[],team2:[],date:'',court:''});
                    setValidationError('');
                    setTimeout(() => fetchMatches(selectedMatchDay), 0);
                  });

                }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="filter-controls" style={{marginBottom:16, display:'flex', alignItems:'center', gap:12, justifyContent:'center'}}>
        <label htmlFor="matchday-select">Match Date: </label>
        <select id="matchday-select" value={selectedMatchDay} onChange={e => setSelectedMatchDay(e.target.value)}>
          <option value="">-- Select --</option>
          {matchDays.map(md => (
            <option key={md.id} value={md.id}>{md.date}{md.finalized ? ' (Finalized)' : ''}</option>
          ))}
        </select>
        {finalizedDays.includes(Number(selectedMatchDay)) && (
          <span style={{color:'#f39c12', fontWeight:'bold'}}>This date is finalized. Results cannot be edited.</span>
        )}
      </div>
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
        disabled={bulkUpdating || Object.keys(changed).length === 0 || finalizedDays.includes(Number(selectedMatchDay))}
      >
        {bulkUpdating ? 'Updating All...' : `Update All (${Object.keys(changed).length})`}
      </button>
      <button
        className="update-btn"
        style={{marginBottom:16, float:'right', marginRight:12, background:'#ffb347', color:'#222'}}
        onClick={handleForceBulkUpdate}
        disabled={bulkUpdating || finalizedDays.includes(Number(selectedMatchDay))}
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
            const isFinalized = finalizedDays.includes(Number(selectedMatchDay));
            // Modal handlers
            const handleTeamEdit = (team) => setEditModal({ matchId: match.id, team });
            const handleTeamSave = (team, ids) => {
              setLocalTeams(prev => ({
                ...prev,
                [match.id]: {
                  ...prev[match.id],
                  [team]: ids
                }
              }));
              setInputs(prev => ({
                ...prev,
                [match.id]: {
                  ...prev[match.id],
                  [team === 'team1' ? 'team1Players' : 'team2Players']: ids
                }
              }));
              setChanged(prev => ({ ...prev, [match.id]: true }));
              setEditModal({ matchId: null, team: null });
            };
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
    {(localTeams[match.id]?.team1 || []).map(pid => {
      const player = players.find(p => p.id === pid);
      return <li key={pid}>{player ? player.name : pid} (ID: {pid})</li>;
    })}
  </ul>
  {!isFinalized && (
    <button className="update-btn" style={{marginTop:4, fontSize:'0.92em'}} onClick={() => handleTeamEdit('team1')}>Edit</button>
  )}
  {(editModal.matchId === match.id && editModal.team === 'team1') && (
    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <PlayerSelector
          players={players}
          selected={localTeams[match.id]?.team1 || []}
          onChange={ids => handleTeamSave('team1', ids)}
          max={team1.length}
          label="Select Team 1 Players"
        />
        <button className="update-btn" onClick={()=>setEditModal({ matchId: null, team: null })}>Cancel</button>
      </div>
    </div>
  )}
</td>
<td>
  <b>Team 2</b>
  <ul style={{margin:0,paddingLeft:16}}>
    {(localTeams[match.id]?.team2 || []).map(pid => {
      const player = players.find(p => p.id === pid);
      return <li key={pid}>{player ? player.name : pid} (ID: {pid})</li>;
    })}
  </ul>
  {!isFinalized && (
    <button className="update-btn" style={{marginTop:4, fontSize:'0.92em'}} onClick={() => handleTeamEdit('team2')}>Edit</button>
  )}
  {(editModal.matchId === match.id && editModal.team === 'team2') && (
    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <PlayerSelector
          players={players}
          selected={localTeams[match.id]?.team2 || []}
          onChange={ids => handleTeamSave('team2', ids)}
          max={team2.length}
          label="Select Team 2 Players"
        />
        <button className="update-btn" onClick={()=>setEditModal({ matchId: null, team: null })}>Cancel</button>
      </div>
    </div>
  )}
</td>
                <td>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <button
                      className={inputs[match.id]?.winnerTeam==='team1'?'winner-btn selected':'winner-btn'}
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team1')}
                      disabled={isFinalized}
                    >Team 1</button>
                    <button
                      className={inputs[match.id]?.winnerTeam==='team2'?'winner-btn selected':'winner-btn'}
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team2')}
                      disabled={isFinalized}
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
                    disabled={isFinalized}
                  />
                </td>
                <td>
                  <button
                    className="update-btn"
                    onClick={() => handleUpdate(match.id, match)}
                    disabled={updating[match.id] || isFinalized}
                  >
                    {isFinalized ? 'Finalized' : (updating[match.id] ? 'Updating...' : 'Update')}
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
        .modal-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.28);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(30,60,90,0.18);
          padding: 32px 24px 24px 24px;
          max-width: 420px;
          width: 96vw;
          max-height: 92vh;
          overflow-y: auto;
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