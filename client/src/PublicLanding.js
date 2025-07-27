import React, { useState } from 'react';
import PublicPerformance from './PublicPerformance';
import Login from './Login';
import './PublicLanding.css';

function PublicLanding() {
  const [view, setView] = useState('landing'); // 'landing', 'performance', 'login'
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

  if (view === 'performance') {
    return (
      <div>
        <div className="public-nav">
          <button onClick={() => setView('landing')} className="back-btn">
            ← Back to Home
          </button>
        </div>
        <PublicPerformance />
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div>
        <div className="public-nav">
          <button onClick={() => setView('landing')} className="back-btn">
            ← Back to Home
          </button>
        </div>
        <Login onLogin={handleLogin} />
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
      <div className="hero-section">
        <div className="hero-content">
          <h1>🏸 Badminton Tournament Manager</h1>
          <p className="hero-subtitle">
            Track performance, view rankings, and manage your badminton tournament
          </p>
          
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-number">Live</div>
              <div className="stat-label">Performance Tracking</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Real-time</div>
              <div className="stat-label">Rankings</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Secure</div>
              <div className="stat-label">Admin Access</div>
            </div>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <div className="action-cards">
          <div className="action-card public">
            <div className="card-icon">👥</div>
            <h3>Public Performance View</h3>
            <p>View all player rankings, performance stats, and match history. No login required.</p>
            <button 
              onClick={() => setView('performance')}
              className="action-btn public-btn"
            >
              View Performance
            </button>
          </div>

          <div className="action-card admin">
            <div className="card-icon">🔐</div>
            <h3>Admin Dashboard</h3>
            <p>Manage players, schedule matches, record results, and update ratings. Admin access required.</p>
            <button 
              onClick={() => setView('login')}
              className="action-btn admin-btn"
            >
              Admin Login
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
        <p>&copy; 2024 Badminton Tournament Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default PublicLanding; 