import React, { useState } from 'react';
import PublicPerformance from './PublicPerformance';
import TopPlayers from './TopPlayers';
import Login from './Login';
import PlayerPerformanceMatrix from './PlayerPerformanceMatrix';
import './PublicLanding.css';

function PublicLanding() {
  const [view, setView] = useState('landing'); // 'landing', 'matrix', 'performance', 'login', 'admin'
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (loginData) => {
    setAuthenticated(true);
    setUser(loginData.user);
    setView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthenticated(false);
    setUser(null);
    setView('landing');
  };

  const goBack = () => {
    setView('landing');
  };

  if (view === 'performance') {
    return (
      <div>
        <PublicPerformance setView={setView} />
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div>
        <div className="public-nav">
          <button className="nav-back-btn" onClick={goBack}>
            ← Back to Home
          </button>
        </div>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  if (view === 'matrix') {
    return (
      <div>
        <div className="public-nav">
          <button className="nav-back-btn" onClick={goBack}>
            ← Back to Home
          </button>
        </div>
        <PlayerPerformanceMatrix view={view} setView={setView} />
      </div>
    );
  }

  if (view === 'admin') {
    // Redirect to the main admin app
    window.location.href = '/admin';
    return null;
  }

  return (
    <div className="public-landing">
      {/* Admin Link in Top Right */}
      <div className="admin-link-container">
        <button 
          className="admin-link-btn"
          onClick={() => setView('login')}
          title="Admin Login"
        >
          🔐 Admin
        </button>
      </div>

      <div className="hero-section">
        <div className="hero-content">
          <h1>🏸 Badminton Tournament Manager</h1>
          <p className="hero-subtitle">
            Track performance, view rankings, and manage your badminton tournament
          </p>
        </div>
      </div>

      <div className="actions-section">
        <div className="action-cards">
          <div className="action-card matrix">
            <div className="card-icon">📊</div>
            <h3>Leaderboard</h3>
            <p>Track and compare player ratings over time with visual trends for each match day.</p>
            <button 
              onClick={() => setView('matrix')}
              className="action-btn matrix-btn"
            >
              View Leaderboard
            </button>
          </div>

          <div className="action-card public">
            <div className="card-icon">👥</div>
            <h3>Detailed Player Performance</h3>
            <p>View all player rankings, performance stats, and match history. No login required.</p>
            <button 
              onClick={() => setView('performance')}
              className="action-btn public-btn"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h4>Performance Analytics</h4>
            <p>Track player ratings, points, and match history</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🏆</div>
            <h4>Live Rankings</h4>
            <p>Real-time player rankings based on current ratings</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📅</div>
            <h4>Match Scheduling</h4>
            <p>Automated match generation and court assignments</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">✅</div>
            <h4>Result Tracking</h4>
            <p>Record match results and update player ratings</p>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <p>Developed by :- Ankesh Somani</p>
      </footer>
    </div>
  );
}

export default PublicLanding; 