import React, { useState, useEffect } from 'react';
import './PublicPerformance.css';
import { api } from './utils/api';

function PublicPerformance({ setView }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('currentRating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(10);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchPerformance();
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    // Reset to first page when search or sort changes
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  const checkScreenSize = () => {
    setIsMobile(window.innerWidth <= 768);
    // Adjust players per page based on screen size
    if (window.innerWidth <= 768) {
      setPlayersPerPage(6); // Fewer cards on mobile for better performance
    } else {
      setPlayersPerPage(10); // More cards on desktop
    }
  };

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicPerformance();
      setPlayers(data);
    } catch (err) {
      setError('Failed to fetch player performance');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const fetchMatchDetails = async (matchId) => {
    setLoadingMatch(true);
    try {
      const data = await api.getPublicMatchDetails(matchId);
      setMatchDetails(data);
    } catch (err) {
      console.error('Error fetching match details:', err);
      setMatchDetails({ error: 'Failed to load match details' });
    }
    setLoadingMatch(false);
  };

  const handleMatchClick = (matchId) => {
    setSelectedMatch(matchId);
    fetchMatchDetails(matchId);
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedPlayers = players
    .filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        const aName = (a && a.name ? a.name : '').toLowerCase();
        const bName = (b && b.name ? b.name : '').toLowerCase();
        if (aName < bName) return sortOrder === 'asc' ? -1 : 1;
        if (aName > bName) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination logic
  const totalPlayers = filteredAndSortedPlayers.length;
  const totalPages = Math.ceil(totalPlayers / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentPlayers = filteredAndSortedPlayers.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    // Scroll to top of player cards
    const playerCards = document.querySelector('.players-grid');
    if (playerCards) {
      playerCards.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="public-performance-container">
        <div className="loading-spinner"></div>
        <p>Loading player performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-performance-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="public-performance-container">
      <div className="header-section" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>Detailed Player Performance</h1>
        <button className="home-btn" onClick={()=>setView ? setView('matrix') : window.location.href='/'} aria-label="Home">
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:'7px',verticalAlign:'middle'}} aria-hidden="true">
    <path d="M3 9.5L10 3L17 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 8.5V16.5C5 17.0523 5.44772 17.5 6 17.5H14C14.5523 17.5 15 17.0523 15 16.5V8.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  Home
</button>
      </div>

      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="sort-controls">
          <span>Sort by: </span>
          <button 
            className={`sort-btn ${sortBy === 'currentRating' ? 'active' : ''}`}
            onClick={() => handleSort('currentRating')}
          >
            Rating {sortBy === 'currentRating' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'totalPoints' ? 'active' : ''}`}
            onClick={() => handleSort('totalPoints')}
          >
            Points {sortBy === 'totalPoints' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'matchesPlayed' ? 'active' : ''}`}
            onClick={() => handleSort('matchesPlayed')}
          >
            Matches {sortBy === 'matchesPlayed' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => handleSort('name')}
          >
            Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {startIndex + 1}-{Math.min(endIndex, totalPlayers)} of {totalPlayers} players
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      </div>

      <div className="players-grid">
        {currentPlayers.map((player, index) => (
          <div key={player.id} className="player-card">
            <div className="player-header">
              <div className="rank-badge">#{startIndex + index + 1}</div>
              <h3 className="player-name">{player.name}</h3>
              <div className="rating-info">
                <span className="current-rating">{player.currentRating}</span>
                <span className="rating-label">Current Rating</span>
              </div>
            </div>
            
            <div className="player-stats">
              <div className="stat-item">
                <span className="stat-value">{player.initialRating}</span>
                <span className="stat-label">Initial Rating</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{player.totalPoints}</span>
                <span className="stat-label">Total Points</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{player.matchesPlayed}</span>
                <span className="stat-label">Matches Played</span>
              </div>
            </div>

            {player.matches.length > 0 && (
              <div className="matches-section">
                <button 
                  className="expand-btn"
                  onClick={() => toggleExpand(player.id)}
                >
                  {expanded[player.id] ? '▼' : '▶'} Recent Matches ({player.matches.length})
                </button>
                
                {expanded[player.id] && (
                  <div className="matches-list">
                    {player.matches.slice(0, 5).map((match) => (
                      <div key={match.matchId} className="match-item">
                        <div className="match-header">
                          <button 
                            className="match-code-link"
                            onClick={() => handleMatchClick(match.matchId)}
                            title="Click to view match details"
                          >
                            {match.matchCode}
                          </button>
                          <span className="match-date">{new Date(match.date).toLocaleDateString()}</span>
                        </div>
                        <div className="match-details">
                          <span className="court">Court {match.court}</span>
                          <span className={`points ${match.points >= 0 ? 'positive' : 'negative'}`}>
                            {match.points >= 0 ? '+' : ''}{match.points} pts
                          </span>
                        </div>
                        {match.score && (
                          <div className="match-score">Score: {match.score}</div>
                        )}
                      </div>
                    ))}
                    {player.matches.length > 5 && (
                      <div className="more-matches">
                        ... and {player.matches.length - 5} more matches
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {player.lastRatingUpdatedOn && (
              <div className="last-updated">
                Last updated: {new Date(player.lastRatingUpdatedOn).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pagination-btn prev-btn"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              {isMobile ? '‹' : 'Previous'}
            </button>
            
            <div className="page-numbers">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button 
              className="pagination-btn next-btn"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              {isMobile ? '›' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {filteredAndSortedPlayers.length === 0 && (
        <div className="no-results">
          <p>No players found matching your search.</p>
        </div>
      )}

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="match-modal-overlay" onClick={closeMatchDetails}>
          <div className="match-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Match Details</h3>
              <button className="close-btn" onClick={closeMatchDetails}>×</button>
            </div>
            
            <div className="modal-content">
              {loadingMatch ? (
                <div className="loading-spinner"></div>
              ) : matchDetails?.error ? (
                <div className="error-message">{matchDetails.error}</div>
              ) : matchDetails ? (
                <div className="match-details-content">
                  <div className="match-info">
                    <div className="info-row">
                      <span className="label">Match Code:</span>
                      <span className="value">{matchDetails.matchCode}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Date:</span>
                      <span className="value">{new Date(matchDetails.date).toLocaleDateString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Court:</span>
                      <span className="value">Court {matchDetails.court}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Type:</span>
                      <span className="value">{matchDetails.matchType}</span>
                    </div>
                    {matchDetails.score && (
                      <div className="info-row">
                        <span className="label">Score:</span>
                        <span className="value score">{matchDetails.score}</span>
                      </div>
                    )}
                  </div>

                  <div className="teams-section">
                    <div className="team team1">
                      <h4>Team 1</h4>
                      <div className="players-list">
                        {matchDetails.team1Players?.map((player, index) => (
                          <div key={player.id} className="player-item">
                            <span className="player-name">{player.name}</span>
                            <span className="player-rating">({player.currentRating})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="vs-divider">
                      <span>VS</span>
                    </div>

                    <div className="team team2">
                      <h4>Team 2</h4>
                      <div className="players-list">
                        {matchDetails.team2Players?.map((player, index) => (
                          <div key={player.id} className="player-item">
                            <span className="player-name">{player.name}</span>
                            <span className="player-rating">({player.currentRating})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {matchDetails.winner && (
                    <div className="winner-section">
                      <h4>🏆 Winner</h4>
                      <div className="winner-team">
                        {matchDetails.winner === 'team1' ? 'Team 1' : 'Team 2'}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicPerformance; 