import React, { useState } from 'react';
import MatchResults from './MatchResults';
import PlayerPerformance from './PlayerPerformance';
import AttendanceAndSchedule from './AttendanceAndSchedule';
import ScheduleExport from './ScheduleExport';
import FinalizeMatches from './FinalizeMatches';

function App() {
  const [screen, setScreen] = useState('results');
  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

  const handleNav = async (target) => {
    setScreen(target);
    if (target === 'export' && !playersLoaded) {
      // Fetch players for export screen
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
      setPlayersLoaded(true);
    }
  };

  return (
    <div className="App">
      <h1>Badminton Tournament Manager</h1>
      <div style={{textAlign:'center', marginBottom:24}}>
        <button
          style={{marginRight:12, padding:'8px 18px', borderRadius:6, border:'1px solid #b3e6ff', background:screen==='results'?'#b3e6ff':'#f0f0f0', fontWeight:'bold', cursor:'pointer'}}
          onClick={()=>handleNav('results')}
        >Match Results</button>
        <button
          style={{marginRight:12, padding:'8px 18px', borderRadius:6, border:'1px solid #b3e6ff', background:screen==='performance'?'#b3e6ff':'#f0f0f0', fontWeight:'bold', cursor:'pointer'}}
          onClick={()=>handleNav('performance')}
        >Player Performance</button>
        <button
          style={{marginRight:12, padding:'8px 18px', borderRadius:6, border:'1px solid #b3e6ff', background:screen==='attendance'?'#b3e6ff':'#f0f0f0', fontWeight:'bold', cursor:'pointer'}}
          onClick={()=>handleNav('attendance')}
        >Attendance & Schedule</button>
        <button
          style={{marginRight:12, padding:'8px 18px', borderRadius:6, border:'1px solid #b3e6ff', background:screen==='finalize'?'#b3e6ff':'#f0f0f0', fontWeight:'bold', cursor:'pointer'}}
          onClick={()=>handleNav('finalize')}
        >Finalize Matches</button>
        <button
          style={{padding:'8px 18px', borderRadius:6, border:'1px solid #b3e6ff', background:screen==='export'?'#b3e6ff':'#f0f0f0', fontWeight:'bold', cursor:'pointer'}}
          onClick={()=>handleNav('export')}
        >Export Schedule</button>
      </div>
      {screen === 'results' ? <MatchResults /> :
        screen === 'performance' ? <PlayerPerformance /> :
        screen === 'attendance' ? <AttendanceAndSchedule /> :
        screen === 'finalize' ? <FinalizeMatches /> :
        <ScheduleExport players={players} />}
    </div>
  );
}

export default App;
