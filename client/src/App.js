import React, { useState } from 'react';
import MatchResults from './MatchResults';
import PlayerPerformance from './PlayerPerformance';
import AttendanceAndSchedule from './AttendanceAndSchedule';
import ScheduleExport from './ScheduleExport';
import FinalizeMatches from './FinalizeMatches';
import { Button } from './components/ui/button'; // Assuming Shadcn UI components are available

function App() {
  const [screen, setScreen] = useState('results');
  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

  const handleNav = async (target) => {
    setScreen(target);
    if (target === 'export' && !playersLoaded) {
      // Fetch players for export screen
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        setPlayers(data);
        setPlayersLoaded(true);
      } catch (error) {
        console.error("Failed to fetch players for export:", error);
        // Optionally, display a message to the user
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased pb-10">
      <h1 className="text-4xl font-extrabold text-center py-8 bg-blue-600 text-white shadow-md rounded-b-lg">
        Badminton Tournament Manager
      </h1>
      <div className="flex flex-wrap justify-center gap-3 p-4 mb-8 bg-white shadow-md rounded-lg mx-auto max-w-6xl">
        <Button
          onClick={() => handleNav('results')}
          variant={screen === 'results' ? 'default' : 'outline'}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-200 ease-in-out"
        >
          Match Results
        </Button>
        <Button
          onClick={() => handleNav('performance')}
          variant={screen === 'performance' ? 'default' : 'outline'}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-200 ease-in-out"
        >
          Player Performance
        </Button>
        <Button
          onClick={() => handleNav('attendance')}
          variant={screen === 'attendance' ? 'default' : 'outline'}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-200 ease-in-out"
        >
          Attendance & Schedule
        </Button>
        <Button
          onClick={() => handleNav('finalize')}
          variant={screen === 'finalize' ? 'default' : 'outline'}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-200 ease-in-out"
        >
          Finalize Matches
        </Button>
        <Button
          onClick={() => handleNav('export')}
          variant={screen === 'export' ? 'default' : 'outline'}
          className="px-6 py-3 rounded-lg font-bold transition-all duration-200 ease-in-out"
        >
          Export Schedule
        </Button>
      </div>
      <div className="px-4">
        {screen === 'results' ? <MatchResults /> :
          screen === 'performance' ? <PlayerPerformance /> :
            screen === 'attendance' ? <AttendanceAndSchedule /> :
              screen === 'finalize' ? <FinalizeMatches /> :
                <ScheduleExport players={players} />}
      </div>
    </div>
  );
}

export default App;
