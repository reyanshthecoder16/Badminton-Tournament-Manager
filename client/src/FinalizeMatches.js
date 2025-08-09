import React, { useState, useEffect } from 'react';
import { api } from './utils/api';

// Accept onFinalize prop to trigger external refresh
function FinalizeMatches({ onFinalize }) {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizedDays, setFinalizedDays] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // all | present | absent
  const [nameSortAsc, setNameSortAsc] = useState(true);

  useEffect(() => {
    api.getMatchDays()
      .then((days) => {
        setMatchDays(days);
        // Extract IDs of finalized days
        const finalized = days.filter(md => md.finalized).map(md => String(md.id));
        setFinalizedDays(finalized);
      })
      .catch(() => setStatus('Failed to load match days'));
  }, []);

  // Load preview when a match day is selected
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedMatchDay) { setPreview(null); return; }
      try {
        setPreviewLoading(true);
        setStatus(null);
        const data = await api.getFinalizePreview(selectedMatchDay);
        setPreview(data);
      } catch (e) {
        setPreview(null);
        setStatus('Error: ' + (e.message || 'Failed to load preview.'));
      } finally {
        setPreviewLoading(false);
      }
    };
    loadPreview();
  }, [selectedMatchDay]);

  const handleRefreshPreview = async () => {
    if (!selectedMatchDay) return;
    try {
      setPreviewLoading(true);
      const data = await api.getFinalizePreview(selectedMatchDay);
      setPreview(data);
    } catch (e) {
      setStatus('Error: ' + (e.message || 'Failed to refresh preview.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedMatchDay || finalizedDays.includes(selectedMatchDay)) return;
    setLoading(true);
    setStatus(null);
    try {
      const data = await api.finalizeMatches({ matchDayId: selectedMatchDay });
      setStatus('Success: ' + (data.message || 'Matches finalized.'));
      setFinalizedDays(prev => prev.includes(selectedMatchDay) ? prev : [...prev, selectedMatchDay]);
      // Refresh preview to reflect finalized status
      try {
        const refreshed = await api.getFinalizePreview(selectedMatchDay);
        setPreview(refreshed);
      } catch (_) {}
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
            <option key={md.id} value={String(md.id)}>{md.date}</option>
          ))}
        </select>
      </div>
      {selectedMatchDay && (
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{margin:0}}>Preview rating changes</h3>
            <button className="secondary-btn" onClick={handleRefreshPreview} disabled={previewLoading}>
              {previewLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {previewLoading && <div style={{marginTop:8}}>Loading preview...</div>}
          {!previewLoading && preview && preview.players && preview.players.length === 0 && (
            <div style={{marginTop:8, color:'#555'}}>No changes recorded for this day yet.</div>
          )}
          {!previewLoading && preview && preview.players && preview.players.length > 0 && (
            <div className="preview-table-wrap">
              {/* Controls */}
              <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:8}}>
                <label>
                  Attendance:
                  <select value={attendanceFilter} onChange={e=>setAttendanceFilter(e.target.value)} style={{marginLeft:8}}>
                    <option value="all">All</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                </label>
                <button className="secondary-btn" onClick={()=>setNameSortAsc(v=>!v)}>
                  Sort by Name: {nameSortAsc ? 'A→Z' : 'Z→A'}
                </button>
              </div>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Attendance</th>
                    <th style={{textAlign:'right'}}>Current</th>
                    <th style={{textAlign:'right'}}>Δ</th>
                    <th style={{textAlign:'right'}}>Predicted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.players
                    .filter(p => attendanceFilter==='all' ? true : attendanceFilter==='present' ? p.present : p.present===false)
                    .sort((a,b)=> nameSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
                    .map(p => (
                    <React.Fragment key={p.playerId}>
                      <tr>
                        <td>{p.name}</td>
                        <td>{p.present ? 'Present' : 'Absent'}</td>
                        <td style={{textAlign:'right'}}>{p.currentRating}</td>
                        <td style={{textAlign:'right', color: p.totalDelta>=0 ? 'green' : 'red'}}>{p.totalDelta>=0?`+${p.totalDelta}`:p.totalDelta}</td>
                        <td style={{textAlign:'right'}}>{p.predictedRating}</td>
                        <td style={{textAlign:'right'}}>
                          <button className="link-btn" onClick={() => setExpanded(e => ({...e, [p.playerId]: !e[p.playerId]}))}>
                            {expanded[p.playerId] ? 'Hide matches' : 'Show matches'}
                          </button>
                        </td>
                      </tr>
                      {expanded[p.playerId] && (
                        <tr className="breakdown-row">
                          <td colSpan={5}>
                            {p.breakdown.length === 0 ? (
                              <div style={{color:'#777'}}>No match entries for this day.</div>
                            ) : (
                              <ul className="breakdown-list">
                                {p.breakdown.map((b, idx) => (
                                  <li key={idx}>
                                    {b.type === 'absence' ? (
                                      <span>Absence penalty: -10</span>
                                    ) : (
                                      <span>
                                        {b.matchCode} (Court {b.court}) — [{b.team1Names.join(', ')}] vs [{b.team2Names.join(', ')}]{b.score?` | Score: ${b.score}`:''} — Points: {b.points}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
        .preview-table-wrap { margin: 12px 0; overflow-x: auto; }
        .preview-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .preview-table th, .preview-table td { padding: 8px; border-bottom: 1px solid #eee; }
        .breakdown-row { background: #fafafa; }
        .breakdown-list { margin: 8px 0 0 16px; }
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
        .secondary-btn {
          background: #e0e0e0;
          color: #333;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
        }
        .link-btn { background: none; border: none; color: #1976d2; cursor: pointer; padding: 0; }
      `}</style>
    </div>
  );
}

export default FinalizeMatches; 