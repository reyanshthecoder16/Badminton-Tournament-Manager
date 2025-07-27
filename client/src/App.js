import React, { useState, useEffect } from 'react';
import MatchResults from './MatchResults';
import PlayerPerformance from './PlayerPerformance';
import AttendanceAndSchedule from './AttendanceAndSchedule';
import ScheduleExport from './ScheduleExport';
import FinalizeMatches from './FinalizeMatches';
import Login from './Login';
import PublicLanding from './PublicLanding';
import { isAuthenticated, getUser, logout, api } from './utils/api';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('results');
  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      if (isAuthenticated()) {
        setAuthenticated(true);
        setUser(getUser());
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (loginData) => {
    setAuthenticated(true);
    setUser(loginData.user);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      setAuthenticated(false);
      setUser(null);
    }
  };

  const handleNav = async (target) => {
    setScreen(target);
    if (target === 'export' && !playersLoaded) {
      // Fetch players for export screen
      try {
        const data = await api.getPlayers();
        setPlayers(data);
        setPlayersLoaded(true);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Check if user is accessing admin route
  const isAdminRoute = window.location.pathname === '/admin';
  
  if (!authenticated && isAdminRoute) {
    return <Login onLogin={handleLogin} />;
  }

  if (!authenticated) {
    return <PublicLanding />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>Badminton Tournament Manager</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-button ${screen === 'results' ? 'active' : ''}`}
          onClick={() => handleNav('results')}
        >
          Match Results
        </button>
        <button
          className={`nav-button ${screen === 'performance' ? 'active' : ''}`}
          onClick={() => handleNav('performance')}
        >
          Player Performance
        </button>
        <button
          className={`nav-button ${screen === 'attendance' ? 'active' : ''}`}
          onClick={() => handleNav('attendance')}
        >
          Attendance & Schedule
        </button>
        <button
          className={`nav-button ${screen === 'finalize' ? 'active' : ''}`}
          onClick={() => handleNav('finalize')}
        >
          Finalize Matches
        </button>
        <button
          className={`nav-button ${screen === 'export' ? 'active' : ''}`}
          onClick={() => handleNav('export')}
        >
          Export Schedule
        </button>
      </nav>

      <main className="app-main">
        {screen === 'results' ? <MatchResults /> :
          screen === 'performance' ? <PlayerPerformance /> :
          screen === 'attendance' ? <AttendanceAndSchedule /> :
          screen === 'finalize' ? <FinalizeMatches /> :
          <ScheduleExport players={players} />}
      </main>
    </div>
  );
}

export default App;
