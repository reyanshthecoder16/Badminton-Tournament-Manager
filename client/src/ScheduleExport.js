import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ScheduleExport({ players }) {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);

  // Helper to get player name by ID
  const playerNameById = (id) => {
    if (!players) return id;
    const p = players.find(p => p.id === id);
    return p ? p.name : id;
  };

  // Helper to download PDF for a court
  const downloadCourtPDF = (court) => {
    // Defensive: sort matches by id ascending before export
    const sortedMatches = [...court.matches].sort((a, b) => a.id - b.id);
    const doc = new jsPDF();
    doc.text(`Court ${court.court} Schedule`, 14, 16);
    const rows = sortedMatches.map(match => [
      match.matchCode,
      match.matchType,
      (match.team1Names || (match.team1||[]).map(playerNameById)).join(', '),
      (match.team2Names || (match.team2||[]).map(playerNameById)).join(', '),
      ''
    ]);
    autoTable(doc, {
      head: [['Match Code', 'Type', 'Team 1', 'Team 2', 'Score']],
      body: rows,
      startY: 22,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [70, 202, 255] }
    });
    doc.save(`court_${court.court}_schedule.pdf`);
  };

  useEffect(() => {
    // Fetch all match days for dropdown
    fetch('/api/schedule/matchdays')
      .then(res => res.json())
      .then(setMatchDays)
      .catch(() => setError('Failed to load match days'));
  }, []);

  const handleSelect = async (e) => {
    const matchDayId = e.target.value;
    setSelectedMatchDay(matchDayId);
    setError(null);
    setSchedule(null);
    if (!matchDayId) return;
    try {
      const res = await fetch(`/api/schedule/${matchDayId}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const data = await res.json();
      setSchedule(data);
    } catch (e) {
      setError('Failed to fetch schedule');
    }
  };

  return (
    <div className="export-container">
      <h2>Export/Print Schedule Per Court</h2>
      <div style={{marginBottom:16}}>
        <label htmlFor="matchday-select">Select Match Day: </label>
        <select id="matchday-select" value={selectedMatchDay} onChange={handleSelect}>
          <option value="">-- Select --</option>
          {matchDays.map(md => (
            <option key={md.id} value={md.id}>{md.date}</option>
          ))}
        </select>
        {error && <div style={{color:'red', marginTop:8}}>{error}</div>}
      </div>
      {schedule && (
        <div className="export-schedule">
          <h3>Schedule Per Court</h3>
          {schedule.map((court, idx) => {
            // Defensive: sort matches by id before rendering
            const sortedMatches = [...court.matches].sort((a, b) => a.id - b.id);
            return (
              <div key={court.court || idx} className="court-block">
                <button className="update-btn" style={{marginBottom:8, float:'right'}} onClick={()=>downloadCourtPDF(court)}>
                  Download PDF
                </button>
                <h4>Court {court.court}</h4>
                <table className="export-table">
                  <thead>
                    <tr>
                      <th>Match Code</th>
                      <th>Type</th>
                      <th>Team 1</th>
                      <th>Team 2</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMatches.map(match => (
                      <tr key={match.id}>
                        <td>{match.matchCode}</td>
                        <td>{match.matchType}</td>
                        <td>{(match.team1Names || (match.team1||[]).map(pid => playerNameById(pid))).join(', ')}</td>
                        <td>{(match.team2Names || (match.team2||[]).map(pid => playerNameById(pid))).join(', ')}</td>
                        <td style={{minWidth:80}}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          <button className="update-btn" style={{marginTop:16}} onClick={()=>window.print()}>Print This Page</button>
        </div>
      )}
      <style>{`
        .export-container {
          max-width: 700px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 32px 24px 24px 24px;
        }
        .export-container h2 {
          text-align: center;
          margin-bottom: 24px;
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

export default ScheduleExport; 