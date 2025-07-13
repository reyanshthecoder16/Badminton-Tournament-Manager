import React, { useEffect, useState } from 'react';

function AttendanceAndSchedule() {
  const [players, setPlayers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
      // Default: all present
      const att = {};
      data.forEach(p => { att[p.id] = true; });
      setAttendance(att);
    } catch (err) {
      setError('Failed to fetch players');
    }
    setLoading(false);
  };

  const handleToggle = (id) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const attArr = players.map(p => ({
        playerId: p.id,
        present: !!attendance[p.id],
        date
      }));
      await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attArr })
      });
      alert('Attendance saved!');
    } catch (err) {
      alert('Failed to save attendance');
    }
    setSaving(false);
  };

  const handleGenerateSchedule = async () => {
    setSchedule(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      alert('Failed to generate schedule');
    }
  };

  // Helper to get player names by ID
  const playerNameById = (id) => {
    const p = players.find(p => p.id === id);
    return p ? p.name : id;
  };

  // Helper to render exportable schedule per court
  const renderExportSchedule = () => {
    if (!schedule) return null;
    // schedule is an array of courts, each with { court, matches }
    return (
      <div className="export-schedule">
        <h3>Schedule Per Court</h3>
        {schedule.map((court, idx) => (
          <div key={court.court || idx} className="court-block">
            <h4>Court {court.court}</h4>
            <table className="export-table">
              <thead>
                <tr>
                  <th>Match Code</th>
                  <th>Type</th>
                  <th>Players</th>
                </tr>
              </thead>
              <tbody>
                {court.matches.map(match => (
                  <tr key={match.id}>
                    <td>{match.matchCode}</td>
                    <td>{match.matchType}</td>
                    <td>{[...(match.team1||[]), ...(match.team2||[])]
                      .map(pid => playerNameById(pid)).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <button className="update-btn" style={{marginTop:16}} onClick={()=>window.print()}>Print This Page</button>
      </div>
    );
  };

  if (loading) return <div className="loader">Loading players...</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;

  return (
    <div className="attendance-container">
      <h2>Player Attendance & Match Scheduling</h2>
      <div style={{marginBottom:16}}>
        <label>Date: </label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Present?</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>
                <button
                  className={attendance[p.id] ? 'present-btn selected' : 'present-btn'}
                  onClick={() => handleToggle(p.id)}
                >{attendance[p.id] ? 'Present' : 'Absent'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop:16, textAlign:'right'}}>
        <button className="update-btn" onClick={handleSaveAttendance} disabled={saving}>
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
        <button className="update-btn" style={{marginLeft:12}} onClick={handleGenerateSchedule}>
          Generate Schedule
        </button>
      </div>
      {schedule && (
        <div className="schedule-section">
          <h3>Generated Schedule</h3>
          <pre style={{background:'#f8f8f8', padding:12, borderRadius:8, maxHeight:300, overflow:'auto'}}>
            {JSON.stringify(schedule, null, 2)}
          </pre>
          <button className="update-btn" style={{marginTop:16}} onClick={()=>setShowExport(true)}>
            Export Schedule per Court
          </button>
          {showExport && (
            <div style={{marginTop:24, background:'#fffbe6', padding:16, borderRadius:8, boxShadow:'0 2px 8px #eee'}}>
              <button style={{float:'right', marginBottom:8}} onClick={()=>setShowExport(false)}>Close</button>
              {renderExportSchedule()}
            </div>
          )}
        </div>
      )}
      <style>{`
        .attendance-container {
          max-width: 600px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 32px 24px 24px 24px;
        }
        .attendance-container h2 {
          text-align: center;
          margin-bottom: 24px;
        }
        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          background: #fafcff;
        }
        .attendance-table th, .attendance-table td {
          border: 1px solid #e0e0e0;
          padding: 8px 10px;
          text-align: center;
        }
        .attendance-table th {
          background: #e6f7ff;
        }
        .present-btn {
          background: #f0f0f0;
          border: 1px solid #b3e6b3;
          border-radius: 4px;
          padding: 4px 18px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
        }
        .present-btn.selected {
          background: #b3e6b3;
          border: 2px solid #4caf50;
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
        .schedule-section {
          margin-top: 32px;
        }
        .loader {
          text-align: center;
          font-size: 1.2rem;
          margin-top: 40px;
        }
        .export-schedule {
          margin-top: 16px;
        }
        .court-block {
          margin-bottom: 32px;
          background: #f7faff;
          border-radius: 8px;
          padding: 16px 12px;
          box-shadow: 0 1px 4px #e0e0e0;
        }
        .court-block h4 {
          margin-top: 0;
        }
        .export-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .export-table th, .export-table td {
          border: 1px solid #b3e6ff;
          padding: 6px 10px;
          text-align: center;
        }
        .export-table th {
          background: #e6f7ff;
        }
      `}</style>
    </div>
  );
}

export default AttendanceAndSchedule; 