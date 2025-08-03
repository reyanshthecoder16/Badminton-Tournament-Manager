import React, { useState, useEffect } from 'react';
import MatchResults from './MatchResults';
import PlayerPerformanceMatrix from './PlayerPerformanceMatrix';
import AttendanceAndSchedule from './AttendanceAndSchedule';
import ScheduleExport from './ScheduleExport';
import FinalizeMatches from './FinalizeMatches';
import Login from './Login';
import PublicPerformance from './PublicPerformance';
import PublicComparison from './PublicComparison';
import PlayerManagement from './PlayerManagement';
import { isAuthenticated, getUser, logout, api } from './utils/api';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'leaderboard', 'performance', 'compare', 'admin', 'results', 'attendance', 'finalize', 'export', 'players'
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Ref for leaderboard reload
  const leaderboardRef = React.useRef();
  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);

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
    setCurrentView('admin');
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
      setCurrentView('home');
    }
  };

  const handleNav = async (target) => {
    setCurrentView(target);
    setShowMobileMenu(false); // Close mobile menu on navigation
    
    if (target === 'export' && !playersLoaded) {
      try {
        const data = await api.getPlayers();
        setPlayers(data);
        setPlayersLoaded(true);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    }
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
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

  // Public Views (not authenticated)
  if (!authenticated) {
    return (
      <div className="App">
        <header className="app-header">
          <div className="header-content">
            <h1>🏸 Badminton Tournament Manager</h1>
            <button 
              className="admin-link-btn"
              onClick={() => setCurrentView('login')}
              title="Admin Login"
            >
              🔐 Admin
            </button>
          </div>
        </header>

        <main className="app-main">
          {currentView === 'home' && (
            <div className="home-page">
              <div className="hero-section">
                <div className="hero-content">
                  <h2>Track Performance & Rankings</h2>
                  <p>View player statistics, match history, and live rankings</p>
                </div>
              </div>

              <div className="action-cards">
                <div className="action-card">
                  <div className="card-icon">📊</div>
                  <h3>Leaderboard</h3>
                  <p>Track player ratings over time with visual trends</p>
                  <button 
                    onClick={() => setCurrentView('leaderboard')}
                    className="action-btn"
                  >
                    View Leaderboard
                  </button>
                </div>

                <div className="action-card">
                  <div className="card-icon">👥</div>
                  <h3>Player Performance</h3>
                  <p>Detailed player rankings and match history</p>
                  <button 
                    onClick={() => setCurrentView('performance')}
                    className="action-btn"
                  >
                    View Details
                  </button>
                </div>

                <div className="action-card">
                  <div className="card-icon">📈</div>
                  <h3>Compare Players</h3>
                  <p>Graph player rating trends side-by-side</p>
                  <button 
                    onClick={() => setCurrentView('compare')}
                    className="action-btn"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'leaderboard' && (
            <div className="page-container">
              <div className="page-header">
                <button className="back-btn" onClick={() => setCurrentView('home')}>
                  ← Back
                </button>
                <h2>Leaderboard</h2>
              </div>
              <PlayerPerformanceMatrix onPlayerClick={(playerId) => { setSelectedPlayerId(playerId); setCurrentView('performance'); }} />
            </div>
          )}

          {currentView === 'performance' && (
            <div className="page-container">
              <div className="page-header">
                <button className="back-btn" onClick={() => setCurrentView('home')}>
                  ← Back
                </button>
                <h2>Player Performance</h2>
              </div>
              <PublicPerformance initialPlayerId={selectedPlayerId} />
            </div>
          )}

          {currentView === 'compare' && (
            <div className="page-container">
              <div className="page-header">
                <button className="back-btn" onClick={() => setCurrentView('home')}>
                  ← Back
                </button>
                <h2>Compare Players</h2>
              </div>
              <PublicComparison />
            </div>
          )}

          {currentView === 'login' && (
            <div className="page-container">
              <div className="page-header">
                <button className="back-btn" onClick={() => setCurrentView('home')}>
                  ← Back
                </button>
                <h2>Admin Login</h2>
              </div>
              <Login onLogin={handleLogin} />
            </div>
          )}
        </main>
      </div>
    );
  }

  // Admin Views (authenticated)
  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🏸 Badminton Tournament Manager</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          ☰
        </button>
      </header>

      <nav className={`app-nav ${showMobileMenu ? 'mobile-open' : ''}`}>
        <button
          className={`nav-button ${currentView === 'admin' ? 'active' : ''}`}
          onClick={() => handleNav('admin')}
        >
          🏠 Home
        </button>
        <button
          className={`nav-button ${currentView === 'results' ? 'active' : ''}`}
          onClick={() => handleNav('results')}
        >
          Results
        </button>
        <button
          className={`nav-button ${currentView === 'attendance' ? 'active' : ''}`}
          onClick={() => handleNav('attendance')}
        >
          📅 Schedule
        </button>
        <button
          className={`nav-button ${currentView === 'finalize' ? 'active' : ''}`}
          onClick={() => handleNav('finalize')}
        >
          ✅ Finalize
        </button>
        <button
          className={`nav-button ${currentView === 'export' ? 'active' : ''}`}
          onClick={() => handleNav('export')}
        >
          📤 Export
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'admin' && (
          <div className="admin-home">
            <h2>Admin Dashboard</h2>
            <div className="admin-cards">
              <div className="admin-card" onClick={() => handleNav('results')}>
                <div className="card-icon">📋</div>
                <h3>Match Results</h3>
                <p>Record and manage match results</p>
              </div>
              <div className="admin-card" onClick={() => handleNav('attendance')}>
                <div className="card-icon">📅</div>
                <h3>Schedule & Attendance</h3>
                <p>Manage match scheduling and attendance</p>
              </div>
              <div className="admin-card" onClick={() => handleNav('finalize')}>
                <div className="card-icon">✅</div>
                <h3>Finalize Matches</h3>
                <p>Finalize match results and update ratings</p>
              </div>
              <div className="admin-card" onClick={() => handleNav('export')}>
                <div className="card-icon">📤</div>
                <h3>Export Schedule</h3>
                <p>Export match schedules and data</p>
              </div>
              <div className="admin-card" onClick={() => handleNav('players')}>
                <div className="card-icon">👥</div>
                <h3>Player Management</h3>
                <p>Add, edit, and manage player details</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'results' && <MatchResults />}
        {currentView === 'attendance' && <AttendanceAndSchedule />}
        {currentView === 'finalize' && <FinalizeMatches onFinalize={() => leaderboardRef.current && leaderboardRef.current.reload()} />}
        {currentView === 'export' && <ScheduleExport players={players} />}
        {currentView === 'players' && <PlayerManagement />}
      </main>
    </div>
  );
}

export default App;
