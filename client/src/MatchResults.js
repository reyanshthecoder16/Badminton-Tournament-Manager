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

  // Fetch players on mount
  useEffect(() => {
    async function fetchPlayers() {
      setPlayersLoading(true);
      setPlayersError(null);
      try {
        const data = await api.getPlayers();
        setPlayers(data);
      } catch (err) {
        setPlayersError('Failed to fetch players');
        console.error('Error fetching players:', err);
      }
      setPlayersLoading(false);
    }
    fetchPlayers();
  }, []);

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
  }, [matchDays]);

  const fetchMatches = async (matchDayId) => {
    setLoading(true);
    setError(null);
    try {
      // Use getMatches() to get all matches with winner data, then filter by matchDayId
      const allMatchesData = await api.getMatches();
      console.log('All matches data from API:', allMatchesData);
      
      // Filter matches by the selected match day
      const filteredMatches = allMatchesData.filter(match => match.MatchDayId == matchDayId);
      console.log('Filtered matches for matchDayId:', matchDayId, filteredMatches);
      
      // Group by court for consistency with the previous structure
      const courts = {};
      filteredMatches.forEach(match => {
        if (!courts[match.court]) courts[match.court] = [];
        courts[match.court].push(match);
      });
      
      // Convert to the expected format
      const data = Object.entries(courts).map(([court, matches]) => ({
        court,
        matches: matches.sort((a, b) => a.id - b.id)
      }));

      // Flatten matches from all courts
      const allMatches = data.flatMap(courtObj =>
        (courtObj.matches || []).map(match => ({
          ...match,
          court: courtObj.court // Attach court number to each match
        }))
      );

      // Initialize localTeams with existing team data
      const initialTeams = {};
      allMatches.forEach(match => {
        initialTeams[match.id] = {
          team1: (match.team1Players || match.team1 || []).map(p => p.id || p),
          team2: (match.team2Players || match.team2 || []).map(p => p.id || p)
        };
      });
      setLocalTeams(initialTeams);

      setMatches(allMatches);
    } catch (err) {
      setError('Failed to fetch matches');
      console.error('Error fetching matches:', err);
    }
    setLoading(false);
  };

  // Helper function to get the current winner team for a match
  const getCurrentWinnerTeam = (match) => {
    // First check if there's a pending input change
    if (inputs[match.id]?.winnerTeam) {
      return inputs[match.id].winnerTeam;
    }
    
    // Then check the stored winnerTeam field
    if (match.winnerTeam) {
      return match.winnerTeam;
    }
    
    // Fallback: try to determine from winnerIds (legacy logic)
    if (match.winnerIds && Array.isArray(match.winnerIds) && match.winnerIds.length > 0) {
      const team1Ids = localTeams[match.id]?.team1 || (match.team1Players || match.team1 || []).map(p => p.id || p);
      const team2Ids = localTeams[match.id]?.team2 || (match.team2Players || match.team2 || []).map(p => p.id || p);
      
      // Check if all winner IDs match team1
      if (team1Ids.length === match.winnerIds.length && 
          match.winnerIds.every(id => team1Ids.includes(Number(id)))) {
        return 'team1';
      }
      
      // Check if all winner IDs match team2
      if (team2Ids.length === match.winnerIds.length && 
          match.winnerIds.every(id => team2Ids.includes(Number(id)))) {
        return 'team2';
      }
    }
    
    return null;
  };

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
    try {
      // Only send the fields that need to be updated
      const updateData = {
        ...inputs[matchId]
      };
      
      // Add team data only if it exists
      if (localTeams[matchId]?.team1 && localTeams[matchId].team1.length > 0) {
        updateData.team1Players = localTeams[matchId].team1;
      }
      if (localTeams[matchId]?.team2 && localTeams[matchId].team2.length > 0) {
        updateData.team2Players = localTeams[matchId].team2;
      }
      
      // Rename scoreInput to score for backend
      if (updateData.scoreInput !== undefined) {
        updateData.score = updateData.scoreInput;
        delete updateData.scoreInput;
      }
      
      await api.updateResult(matchId, updateData);
      
      setChanged(prev => ({ ...prev, [matchId]: false }));
      setInputs(prev => ({ ...prev, [matchId]: {} }));
      setUpdating(prev => ({ ...prev, [matchId]: false }));
      
      // Refresh matches
      await fetchMatches(selectedMatchDay);
    } catch (error) {
      console.error('Error updating match:', error);
      setUpdating(prev => ({ ...prev, [matchId]: false }));
    }
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    try {
      const updates = Object.keys(changed).filter(matchId => changed[matchId]).map(matchId => {
        const updateData = {
          ...inputs[matchId]
        };
        
        // Add team data only if it exists
        if (localTeams[matchId]?.team1 && localTeams[matchId].team1.length > 0) {
          updateData.team1Players = localTeams[matchId].team1;
        }
        if (localTeams[matchId]?.team2 && localTeams[matchId].team2.length > 0) {
          updateData.team2Players = localTeams[matchId].team2;
        }
        
        // Rename scoreInput to score for backend
        console.log('updateData', updateData);
        if (updateData.scoreInput !== undefined) {
          updateData.score = updateData.scoreInput;
          delete updateData.scoreInput;
        }
        
        return {
          id: matchId,
          updateData
        };
      });
      
      for (const update of updates) {
        await api.updateResult(update.id, update.updateData);
      }
      
      setChanged({});
      setInputs({});
      setBulkUpdating(false);
      
      // Refresh matches
      await fetchMatches(selectedMatchDay);
    } catch (error) {
      console.error('Error bulk updating:', error);
      setBulkUpdating(false);
    }
  };

  const handleForceBulkUpdate = async () => {
    setBulkUpdating(true);
    try {
      const updates = matches.map(match => {
        const updateData = {
          ...inputs[match.id]
        };
        
        // Add team data only if it exists
        if (localTeams[match.id]?.team1 && localTeams[match.id].team1.length > 0) {
          updateData.team1Players = localTeams[match.id].team1;
        }
        if (localTeams[match.id]?.team2 && localTeams[match.id].team2.length > 0) {
          updateData.team2Players = localTeams[match.id].team2;
        }
        
        // Rename scoreInput to score for backend
        if (updateData.scoreInput !== undefined) {
          updateData.score = updateData.scoreInput;
          delete updateData.scoreInput;
        }
        
        return {
          id: match.id,
          updateData
        };
      });
      
      for (const update of updates) {
        await api.updateResult(update.id, update.updateData);
      }
      
      setChanged({});
      setInputs({});
      setBulkUpdating(false);
      
      // Refresh matches
      await fetchMatches(selectedMatchDay);
    } catch (error) {
      console.error('Error force bulk updating:', error);
      setBulkUpdating(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  function getSortedMatches() {
    const allMatches = [...matches, ...manualMatches];
    if (!sortBy) return allMatches.sort(defaultMultiSort);
    
    return allMatches.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'date') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (sortBy === 'court') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Helper function to get player name by ID
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id == playerId);
    return player ? player.name : `Player ${playerId}`;
  };

  if (loading) return <div>Loading matches...</div>;
  if (error) return <div>Error: {error}</div>;
  if (playersLoading) return <div>Loading players...</div>;
  if (playersError) return <div>Error loading players: {playersError}</div>;

  return (
    <div className="match-results-container">
      <h2>Match Results</h2>
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
        disabled={bulkUpdating || Object.keys(changed).filter(k => changed[k]).length === 0 || finalizedDays.includes(Number(selectedMatchDay))}
      >
        {bulkUpdating ? 'Updating All...' : `Update All (${Object.keys(changed).filter(k => changed[k]).length})`}
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
            const currentWinner = getCurrentWinnerTeam(match);
            
            // Get current team IDs from localTeams or fallback to original data
            const currentTeam1Ids = localTeams[match.id]?.team1 || team1.map(p => p.id || p);
            const currentTeam2Ids = localTeams[match.id]?.team2 || team2.map(p => p.id || p);
            
            // Get the selected match day data for fallback date
            const selectedMatchDayData = matchDays.find(md => md.id == selectedMatchDay);
            
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
              setChanged(prev => ({ ...prev, [match.id]: true }));
              setEditModal({ matchId: null, team: null });
            };
            
            return (
              <tr key={match.id}>
                <td>{match.id}</td>
                <td>{(match.date ? match.date.slice(0, 10) : selectedMatchDayData?.date) || ''}</td>
                <td>{match.court || ''}</td>
                <td>{match.matchCode || ''}</td>
                <td>{match.matchType || ''}</td>
                <td>
                  <b>Team 1</b>
                  <ul style={{margin:0,paddingLeft:16}}>
                    {currentTeam1Ids.map(pid => (
                      <li key={pid}>{getPlayerName(pid)}</li>
                    ))}
                  </ul>
                  {!isFinalized && (
                    <button className="update-btn" style={{marginTop:4, fontSize:'0.92em'}} onClick={() => handleTeamEdit('team1')}>Edit</button>
                  )}
                  {(editModal.matchId === match.id && editModal.team === 'team1') && (
                    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
                      <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <PlayerSelector
                          players={players}
                          selected={currentTeam1Ids}
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
                    {currentTeam2Ids.map(pid => (
                      <li key={pid}>{getPlayerName(pid)}</li>
                    ))}
                  </ul>
                  {!isFinalized && (
                    <button className="update-btn" style={{marginTop:4, fontSize:'0.92em'}} onClick={() => handleTeamEdit('team2')}>Edit</button>
                  )}
                  {(editModal.matchId === match.id && editModal.team === 'team2') && (
                    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
                      <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <PlayerSelector
                          players={players}
                          selected={currentTeam2Ids}
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
                      className={
                        currentWinner === 'team1'
                          ? 'winner-btn selected' : 'winner-btn'
                      }
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team1')}
                      disabled={isFinalized}
                    >Team 1</button>
                    <button
                      className={
                        currentWinner === 'team2'
                          ? 'winner-btn selected' : 'winner-btn'
                      }
                      onClick={() => handleInputChange(match.id, 'winnerTeam', 'team2')}
                      disabled={isFinalized}
                    >Team 2</button>
                  </div>
                </td>
                <td>
                  <input
                    className="score-input"
                    type="text"
                    value={inputs[match.id]?.scoreInput !== undefined ? inputs[match.id].scoreInput : (match.score || '')}
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
          margin-top: 16px;
        }
        .match-table th, .match-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        .match-table th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .update-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .update-btn:hover {
          background: #45a049;
        }
        .update-btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        .winner-btn {
          background: #f0f0f0;
          border: 1px solid #ddd;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .winner-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }
        .winner-btn.selected {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }
        .winner-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .score-input {
          width: 80px;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .modal-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

export default MatchResults;