import React, { useState, useEffect } from 'react';
import { api } from './utils/api';

function FinalizeMatches() {
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
      const data = await api.finalizeMatches({ matchDayId: selectedMatchDay });
      setStatus('Success: ' + (data.message || 'Matches finalized.'));
      setFinalizedDays(prev => [...prev, selectedMatchDay]);
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