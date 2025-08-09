import React, { useEffect, useState } from 'react';
import { api } from './utils/api';
import PlayerSelector from './PlayerSelector';
import './MatchResults.css';

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
  // Dual-team modal state
  const [dualTeamState, setDualTeamState] = useState({ team1: [], team2: [] });
  // Manual match modal and state
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchCode: '',
    matchType: '',
    team1: [],
    team2: [],
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
    setValidationError('');
    try {
      const team1Players = localTeams[matchId]?.team1 || (match.team1Players || match.team1 || []).map(p => p.id || p);
      const team2Players = localTeams[matchId]?.team2 || (match.team2Players || match.team2 || []).map(p => p.id || p);
      // Figure out winnerTeam if set in inputs or match
      let winnerTeam = undefined;
      if (inputs[matchId]?.winnerTeam) {
        winnerTeam = inputs[matchId].winnerTeam;
      } else if (match.winnerIds) {
        if (JSON.stringify(match.winnerIds) === JSON.stringify(team1Players)) winnerTeam = 'team1';
        else if (JSON.stringify(match.winnerIds) === JSON.stringify(team2Players)) winnerTeam = 'team2';
      }
      // Score
      const score = inputs[matchId]?.scoreInput !== undefined ? inputs[matchId].scoreInput : (match.score || '');
      // Validate
      if (team1Players.some(id => team2Players.includes(id))) {
        setValidationError('A player cannot be in both teams.');
        setUpdating(prev => ({ ...prev, [matchId]: false }));
        return;
      }
      // Send update
      await api.updateResult(matchId, {
        team1Players,
        team2Players,
        winnerTeam,
        score
      });
      await fetchMatches(selectedMatchDay);
      setChanged(prev => ({ ...prev, [matchId]: false }));
      setLocalTeams(prev => ({ ...prev, [matchId]: undefined }));
      setInputs(prev => ({ ...prev, [matchId]: {} }));
    } catch (err) {
      setValidationError(err.message || 'Update failed');
    }
    setUpdating(prev => ({ ...prev, [matchId]: false }));
  };

  const handleDualTeamEdit = (match) => {
    setEditModal({ matchId: match.id, team: 'both' });
    setDualTeamState({
      team1: localTeams[match.id]?.team1 || (match.team1Players || match.team1 || []).map(p => p.id || p),
      team2: localTeams[match.id]?.team2 || (match.team2Players || match.team2 || []).map(p => p.id || p)
    });
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match? This will remove the match and all associated rating awards.')) {
      return;
    }
    
    setUpdating(prev => ({ ...prev, [matchId]: true }));
    try {
      await api.deleteMatch(matchId);
      await fetchMatches(selectedMatchDay);
      setValidationError('');
    } catch (err) {
      setValidationError(err.message || 'Failed to delete match');
    }
    setUpdating(prev => ({ ...prev, [matchId]: false }));
  };

  const handleAddMatch = async () => {
    setValidationError('');
    
    // Validation
    if (!newMatch.matchCode || !newMatch.matchType || !newMatch.court) {
      setValidationError('Please fill in all required fields.');
      return;
    }
    
    if (newMatch.team1.length === 0 || newMatch.team2.length === 0) {
      setValidationError('Both teams must have players.');
      return;
    }
    
    if (newMatch.team1.some(id => newMatch.team2.includes(id))) {
      setValidationError('A player cannot be in both teams.');
      return;
    }
    
    const maxPlayers = newMatch.matchType === 'singles' ? 1 : 2;
    if (newMatch.team1.length !== maxPlayers || newMatch.team2.length !== maxPlayers) {
      setValidationError(`${newMatch.matchType} matches require ${maxPlayers} player(s) per team.`);
      return;
    }
    
    try {
      // Get current match day date
      const currentMatchDay = matchDays.find(md => md.id == selectedMatchDay);
      const matchDate = currentMatchDay ? currentMatchDay.date : new Date().toISOString().split('T')[0];
      
      await api.createMatch({
        matchCode: newMatch.matchCode,
        matchType: newMatch.matchType,
        court: parseInt(newMatch.court),
        team1: newMatch.team1,
        team2: newMatch.team2,
        date: matchDate,
        MatchDayId: selectedMatchDay
      });
      
      // Reset form and close modal
      setNewMatch({
        matchCode: '',
        matchType: '',
        team1: [],
        team2: [],
        court: '',
      });
      setAddMatchModal(false);
      
      // Refresh matches
      await fetchMatches(selectedMatchDay);
      setValidationError('');
    } catch (err) {
      setValidationError(err.message || 'Failed to create match');
    }
  };

  const handleDualTeamSave = async (match) => {
    const team1Size = match.team1Players?.length || match.team1?.length || 0;
    const team2Size = match.team2Players?.length || match.team2?.length || 0;
    if (dualTeamState.team1.length !== team1Size || dualTeamState.team2.length !== team2Size) {
      setValidationError('Each team must have the correct number of players.');
      return;
    }
    if (dualTeamState.team1.some(id => dualTeamState.team2.includes(id))) {
      setValidationError('A player cannot be in both teams.');
      return;
    }
    
    // Check if teams actually changed
    const currentTeam1 = (match.team1Players || match.team1 || []).map(p => p.id || p).sort();
    const currentTeam2 = (match.team2Players || match.team2 || []).map(p => p.id || p).sort();
    const newTeam1 = [...dualTeamState.team1].sort();
    const newTeam2 = [...dualTeamState.team2].sort();
    
    const teamsChanged = JSON.stringify(currentTeam1) !== JSON.stringify(newTeam1) || 
                        JSON.stringify(currentTeam2) !== JSON.stringify(newTeam2);
    
    setValidationError('');
    
    // Auto-save to backend immediately
    setUpdating(prev => ({ ...prev, [match.id]: true }));
    try {
      await api.updateResult(match.id, {
        team1Players: dualTeamState.team1,
        team2Players: dualTeamState.team2,
        // Clear winner selection if teams changed (old winner may be invalid)
        winnerTeam: teamsChanged ? undefined : (inputs[match.id]?.winnerTeam || match.winnerTeam),
        score: inputs[match.id]?.scoreInput !== undefined ? inputs[match.id].scoreInput : (match.score || '')
      });
      
      // Clear any pending winner selection in local state if teams changed
      if (teamsChanged) {
        setInputs(prev => ({
          ...prev,
          [match.id]: {
            ...prev[match.id],
            winnerTeam: undefined
          }
        }));
      }
      
      // Refresh matches to show updated data
      await fetchMatches(selectedMatchDay);
      setEditModal({ matchId: null, team: null });
      
      if (teamsChanged) {
        setValidationError('Teams updated! Please re-select the winner if this match has been played.');
      } else {
        setValidationError('');
      }
    } catch (err) {
      setValidationError(err.message || 'Failed to update teams');
    }
    setUpdating(prev => ({ ...prev, [match.id]: false }));
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

  // Helper function to format date as DD-MON-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Compute team rating sums (current and initial)
  const getTeamRatingSums = (playerIds = []) => {
    return playerIds.reduce((acc, pid) => {
      const player = players.find(p => p.id == pid);
      const current = player?.currentRating ?? 0;
      const initial = player?.initialRating ?? 0;
      return { sumCurrent: acc.sumCurrent + current, sumInitial: acc.sumInitial + initial };
    }, { sumCurrent: 0, sumInitial: 0 });
  };

  // Decide stronger team: higher sum of currentRating; tie-breaker higher sum of initialRating
  const getStrongerTeam = (team1Ids = [], team2Ids = []) => {
    const t1 = getTeamRatingSums(team1Ids);
    const t2 = getTeamRatingSums(team2Ids);
    if (t1.sumCurrent > t2.sumCurrent) return 'team1';
    if (t1.sumCurrent < t2.sumCurrent) return 'team2';
    if (t1.sumInitial > t2.sumInitial) return 'team1';
    if (t1.sumInitial < t2.sumInitial) return 'team2';
    return 'equal';
  };

  if (loading) return <div>Loading matches...</div>;
  if (error) return <div>Error: {error}</div>;
  if (playersLoading) return <div>Loading players...</div>;
  if (playersError) return <div>Error loading players: {playersError}</div>;

  return (
    <div className="match-results-container">
      <h2>Match Results</h2>
      <div className="filter-controls">
        <label htmlFor="matchday-select">Match Date: </label>
        <select id="matchday-select" value={selectedMatchDay} onChange={e => setSelectedMatchDay(e.target.value)}>
          <option value="">-- Select --</option>
          {matchDays.map(md => (
            <option key={md.id} value={md.id}>{md.date}{md.finalized ? ' (Finalized)' : ''}</option>
          ))}
        </select>
        {finalizedDays.includes(Number(selectedMatchDay)) && (
          <span className="finalized-warning">This date is finalized. Results cannot be edited.</span>
        )}
      </div>
      <div className="sort-controls">
        <span>Sort by: </span>
        <button className={sortBy==='date' ? 'active' : ''} onClick={() => handleSort('date')}>Date {sortBy==='date' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='court' ? 'active' : ''} onClick={() => handleSort('court')}>Court {sortBy==='court' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='id' ? 'active' : ''} onClick={() => handleSort('id')}>ID {sortBy==='id' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        <button className={sortBy==='matchCode' ? 'active' : ''} onClick={() => handleSort('matchCode')}>Match {sortBy==='matchCode' ? (sortOrder==='asc'?'▲':'▼') : ''}</button>
        {sortBy && <button className="reset-btn" onClick={()=>setSortBy('')}>Reset</button>}
      </div>
      <button
        className="bulk-update-btn update-btn"
        onClick={handleBulkUpdate}
        disabled={bulkUpdating || Object.keys(changed).filter(k => changed[k]).length === 0 || finalizedDays.includes(Number(selectedMatchDay))}
      >
        {bulkUpdating ? 'Updating All...' : `Update All (${Object.keys(changed).filter(k => changed[k]).length})`}
      </button>
      <button
        className="force-bulk-btn update-btn"
        onClick={handleForceBulkUpdate}
        disabled={bulkUpdating || finalizedDays.includes(Number(selectedMatchDay))}
      >
        {bulkUpdating ? 'Force Updating...' : 'Force Update All'}
      </button>
      <button
        className="add-match-btn update-btn"
        onClick={() => setAddMatchModal(true)}
        disabled={!selectedMatchDay}
      >
        + Add Match
      </button>
      <div className="table-scroll">
      <table className="match-table">
        <thead>
          <tr>
            <th className="col-id">ID</th>
            <th>Date</th>
            <th>Court</th>
            <th>Code</th>
            <th className="col-type">Type</th>
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
            
            const strongerTeam = getStrongerTeam(currentTeam1Ids, currentTeam2Ids);
            return (
              <tr key={match.id}>
                <td className="col-id">{match.id}</td>
                <td>{formatDate(match.date)}</td>
                <td>{match.court}</td>
                <td>{match.matchCode}</td>
                <td className="col-type">{match.matchType}</td>
                <td className={`team-cell ${strongerTeam === 'team1' ? 'team-strong' : strongerTeam === 'team2' ? 'team-weak' : 'team-equal'}`}>
                  <b>Team 1</b>
                  <ul className="list-indent">
                    {currentTeam1Ids.map(pid => (
                      <li key={pid}>{getPlayerName(pid)}</li>
                    ))}
                  </ul>
                  {!isFinalized && (
                    <button className="update-btn small" onClick={() => handleDualTeamEdit(match)}>Edit</button>
                  )}
                  {(editModal.matchId === match.id && editModal.team === 'both') && (
                    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
                      <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <div className="flex-gap-24">
                          <div className="flex-1">
                            <PlayerSelector
                              players={players}
                              selected={dualTeamState.team1}
                              onChange={ids => setDualTeamState(s => ({ ...s, team1: ids }))}
                              max={team1.length}
                              label="Select Team 1 Players"
                            />
                          </div>
                          <div className="flex-1">
                            <PlayerSelector
                              players={players}
                              selected={dualTeamState.team2}
                              onChange={ids => setDualTeamState(s => ({ ...s, team2: ids }))}
                              max={team2.length}
                              label="Select Team 2 Players"
                            />
                          </div>
                        </div>
                        {validationError && <div className="error-text">{validationError}</div>}
                        <div className="flex-gap-8">
                          <button className="update-btn" onClick={()=>handleDualTeamSave(match)} disabled={updating[match.id]}>{
                            updating[match.id] ? 'Saving...' : 'Save'
                          }</button>
                          <button className="update-btn" onClick={()=>setEditModal({ matchId: null, team: null })}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td className={`team-cell ${strongerTeam === 'team2' ? 'team-strong' : strongerTeam === 'team1' ? 'team-weak' : 'team-equal'}`}>
                  <b>Team 2</b>
                  <ul className="list-indent">
                    {currentTeam2Ids.map(pid => (
                      <li key={pid}>{getPlayerName(pid)}</li>
                    ))}
                  </ul>
                  {!isFinalized && (
                    <button className="update-btn small" onClick={() => handleDualTeamEdit(match)}>Edit</button>
                  )}
                  {(editModal.matchId === match.id && editModal.team === 'both') && (
                    <div className="modal-bg" onClick={()=>setEditModal({ matchId: null, team: null })}>
                      <div className="modal-content" onClick={e=>e.stopPropagation()}>
                        <div className="flex-gap-24">
                          <div className="flex-1">
                            <PlayerSelector
                              players={players}
                              selected={dualTeamState.team1}
                              onChange={ids => setDualTeamState(s => ({ ...s, team1: ids }))}
                              max={team1.length}
                              label="Select Team 1 Players"
                            />
                          </div>
                          <div className="flex-1">
                            <PlayerSelector
                              players={players}
                              selected={dualTeamState.team2}
                              onChange={ids => setDualTeamState(s => ({ ...s, team2: ids }))}
                              max={team2.length}
                              label="Select Team 2 Players"
                            />
                          </div>
                        </div>
                        {validationError && <div className="error-text">{validationError}</div>}
                        <div className="flex-gap-8">
                          <button className="update-btn" onClick={()=>handleDualTeamSave(match)} disabled={updating[match.id]}>{
                            updating[match.id] ? 'Saving...' : 'Save'
                          }</button>
                          <button className="update-btn" onClick={()=>setEditModal({ matchId: null, team: null })}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <div className="winner-actions">
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
                  <div className="row-actions">
                    <button
                      className="update-btn"
                      onClick={() => handleUpdate(match.id, match)}
                      disabled={updating[match.id] || isFinalized}
                    >
                      {isFinalized ? 'Finalized' : (updating[match.id] ? 'Updating...' : 'Update')}
                    </button>
                    {!isFinalized && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={updating[match.id]}
                      >
                        {updating[match.id] ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {validationError && <div style={{color:'red',marginTop:16}}>{validationError}</div>}
      
      {/* Manual Match Creation Modal */}
      {addMatchModal && (
        <div className="modal-bg" onClick={() => setAddMatchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add Manual Match</h3>
            <div style={{marginBottom: 16}}>
              <label>Match Code:</label>
              <input
                type="text"
                value={newMatch.matchCode}
                onChange={e => setNewMatch(prev => ({...prev, matchCode: e.target.value}))}
                placeholder="e.g., M1, M2, etc."
                style={{width: '100%', padding: '8px', marginTop: '4px'}}
              />
            </div>
            <div style={{marginBottom: 16}}>
              <label>Match Type:</label>
              <select
                value={newMatch.matchType}
                onChange={e => setNewMatch(prev => ({...prev, matchType: e.target.value}))}
                style={{width: '100%', padding: '8px', marginTop: '4px'}}
              >
                <option value="">Select type...</option>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed">Mixed Doubles</option>
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label>Court:</label>
              <input
                type="number"
                value={newMatch.court}
                onChange={e => setNewMatch(prev => ({...prev, court: e.target.value}))}
                placeholder="Court number"
                style={{width: '100%', padding: '8px', marginTop: '4px'}}
              />
            </div>
            <div style={{marginBottom: 16}}>
              <label>Team 1 Players:</label>
              <PlayerSelector
                players={players}
                selected={newMatch.team1}
                onChange={ids => setNewMatch(prev => ({...prev, team1: ids}))}
                max={newMatch.matchType === 'singles' ? 1 : 2}
                label="Select Team 1 Players"
              />
            </div>
            <div style={{marginBottom: 16}}>
              <label>Team 2 Players:</label>
              <PlayerSelector
                players={players}
                selected={newMatch.team2}
                onChange={ids => setNewMatch(prev => ({...prev, team2: ids}))}
                max={newMatch.matchType === 'singles' ? 1 : 2}
                label="Select Team 2 Players"
              />
            </div>
            {validationError && <div style={{color:'red', marginBottom: 16}}>{validationError}</div>}
            <div className="flex-gap-8">
              <button
                className="update-btn"
                onClick={handleAddMatch}
                disabled={!newMatch.matchCode || !newMatch.matchType || newMatch.team1.length === 0 || newMatch.team2.length === 0}
              >
                Add Match
              </button>
              <button className="update-btn" onClick={() => setAddMatchModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .match-results-container { max-width: 1100px; margin: 24px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); padding: 20px 18px; }
        .match-results-container h2 {
          text-align: center;
          margin-bottom: 12px;
        }
        .filter-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; margin-bottom:10px; }
        .finalized-warning { color:#c62828; font-weight:600; font-size:0.9rem; }
        .sort-controls { display: flex; flex-wrap:wrap; align-items: center; gap: 8px; margin-bottom: 12px; justify-content: center; }
        .sort-controls button {
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sort-controls button.active, .sort-controls button:hover {
          background: #b3e6ff;
        }
        .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .match-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .match-table th, .match-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
        .match-table th {
          background: #f5f5f5;
          font-weight: 600;
          white-space: nowrap;
        }
        .update-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .update-btn.small { padding: 4px 8px; font-size: 0.8rem; }
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
        .winner-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .score-input { width: 86px; max-width: 100%; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; }
        .row-actions { display:flex; flex-direction:column; gap:4px; }
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
        .team-cell { position: relative; background: #fafafa; }
        .team-strong {
          background: #e8f5e9; /* green tint */
          box-shadow: inset 4px 0 0 #2e7d32;
        }
        .team-weak {
          background: #ffebee; /* red tint */
          box-shadow: inset 4px 0 0 #c62828;
        }
        .team-equal {
          background: #fffde7; /* amber tint */
          box-shadow: inset 4px 0 0 #f9a825;
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
          .match-results-container { margin: 0; border-radius: 0; box-shadow: none; padding: 12px 8px; }
          .sort-controls button { padding: 6px 10px; font-size: 0.85rem; }
          .col-id, .col-type { display: none; }
          .match-table th, .match-table td { padding: 8px 6px; font-size: 0.9rem; }
          .row-actions { flex-direction: row; gap: 6px; }
          .update-btn, .delete-btn { padding: 6px 8px; font-size: 0.82rem; }
          .winner-actions { gap: 6px; }
          .score-input { width: 72px; }
        }
      `}</style>
    </div>
  );
}

export default MatchResults;