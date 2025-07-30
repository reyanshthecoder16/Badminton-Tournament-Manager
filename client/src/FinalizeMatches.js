import React, { useState, useEffect } from 'react';
import { api } from './utils/api';

// Accept onFinalize prop to trigger external refresh
function FinalizeMatches({ onFinalize }) {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizedDays, setFinalizedDays] = useState([]);

  useEffect(() => {
    api.getMatchDays()
      .then(setMatchDays)
      .catch(() => setStatus('Failed to load match days'));
  }, []);

  const handleFinalize = async () => {
    if (!selectedMatchDay || finalizedDays.includes(selectedMatchDay)) return;
    setLoading(true);
    setStatus(null);
    try {
      // First finalize matches as before
      const data = await api.finalizeMatches({ matchDayId: selectedMatchDay });
      // Find the date string for the selected match day ID
      const matchDayObj = matchDays.find(md => md.id === selectedMatchDay);
      const matchDayDate = matchDayObj ? matchDayObj.date : selectedMatchDay;
      // Then fetch attendance for the day using the date string
      const attendanceData = await api.getAttendanceByDate(matchDayDate);
      // attendanceData: [{ playerId, present, date }]
      const absentPlayers = attendanceData.filter(a => !a.present).map(a => a.playerId);
      let penalized = [];
      // Penalize each absent player
      for (const playerId of absentPlayers) {
        try {
          // Fetch player data
          const player = await api.getPlayers().then(players => players.find(p => p.id === playerId));
          if (player) {
            const newRating = (player.currentRating || player.initialRating || 0) - 10;
            await api.updatePlayer(playerId, { ...player, currentRating: newRating });
            penalized.push(player.name || playerId);
          }
        } catch (err) { /* continue */ }
      }
      setStatus('Success: ' + (data.message || 'Matches finalized.') + (penalized.length ? ` | -10 points: ${penalized.join(', ')}` : ''));
      setFinalizedDays(prev => [...prev, selectedMatchDay]);
      // If a parent provided onFinalize, call it to trigger leaderboard refetch
      if (typeof onFinalize === 'function') {
        onFinalize();
      }
    } catch (e) {
      setStatus('Error: ' + (e.message || 'Failed to finalize matches.'));
    }
    setLoading(false);
  };


  return (
    <div className="finalize-container">
      <h2>Finalize Matches & Update Ratings</h2>
      <div style={{marginBottom:16}}>
        <label htmlFor="matchday-select">Select Match Day: </label>
        <select id="matchday-select" value={selectedMatchDay} onChange={e => setSelectedMatchDay(e.target.value)}>
          <option value="">-- Select --</option>
          {matchDays.map(md => (
            <option key={md.id} value={md.id}>{md.date}</option>
          ))}
        </select>
      </div>
      <button className="update-btn" onClick={handleFinalize} disabled={!selectedMatchDay || loading || finalizedDays.includes(selectedMatchDay)}>
        {finalizedDays.includes(selectedMatchDay)
          ? 'Already Finalized'
          : loading ? 'Finalizing...' : 'Finalize Matches'}
      </button>
      {finalizedDays.includes(selectedMatchDay) && (
        <div style={{marginTop:8, color:'#f39c12'}}>This match day has already been finalized.</div>
      )}
      {status && <div style={{marginTop:16, color: status.startsWith('Success') ? 'green' : 'red'}}>{status}</div>}
      <style>{`
        .finalize-container {
          max-width: 500px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 32px 24px 24px 24px;
        }
        .finalize-container h2 {
          text-align: center;
          margin-bottom: 24px;
        }
        .update-btn {
          background: #4caf50;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 20px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .update-btn:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default FinalizeMatches; 