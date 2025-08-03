import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import './PlayerManagement.css';

function PlayerManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    initialRating: 1000,
    currentRating: 1000,
    joiningDate: new Date().toISOString().slice(0, 10)
  });
  const [saving, setSaving] = useState(false);
  const [playerMatchHistory, setPlayerMatchHistory] = useState({});

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPlayers();
      // Sort by currentRating desc, then initialRating desc
      const sorted = [...data].sort((a, b) => {
        const crA = a.currentRating ?? 0;
        const crB = b.currentRating ?? 0;
        if (crB !== crA) return crB - crA;
        const irA = a.initialRating ?? 0;
        const irB = b.initialRating ?? 0;
        return irB - irA;
      });
      setPlayers(sorted);
      
      // Fetch match history for each player
      const matchHistory = {};
      for (const player of sorted) {
        try {
          const hasMatches = await api.checkPlayerMatches(player.id);
          matchHistory[player.id] = hasMatches;
        } catch (err) {
          console.error(`Error checking matches for player ${player.id}:`, err);
          matchHistory[player.id] = false;
        }
      }
      setPlayerMatchHistory(matchHistory);
    } catch (err) {
      setError('Failed to fetch players');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    setEditingPlayer(null);
    setFormData({
      name: '',
      gender: '',
      initialRating: 1000,
      currentRating: 1000,
      joiningDate: new Date().toISOString().slice(0, 10)
    });
    setShowForm(true);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name || '',
      gender: player.gender || '',
      initialRating: player.initialRating || 1000,
      currentRating: player.currentRating || 1000,
      joiningDate: player.joiningDate ? new Date(player.joiningDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPlayer(null);
    setFormData({
      name: '',
      gender: '',
      initialRating: 1000,
      currentRating: 1000,
      joiningDate: new Date().toISOString().slice(0, 10)
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'initialRating' || name === 'currentRating' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Player name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingPlayer) {
        // Update existing player
        await api.updatePlayer(editingPlayer.id, formData);
      } else {
        // Create new player
        await api.createPlayer(formData);
      }
      
      await fetchPlayers(); // Refresh the list
      handleCancel(); // Close form
      alert(editingPlayer ? 'Player updated successfully!' : 'Player added successfully!');
    } catch (err) {
      console.error('Error saving player:', err);
      alert('Failed to save player. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (player) => {
    if (!window.confirm(`Are you sure you want to delete ${player.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deletePlayer(player.id);
      await fetchPlayers(); // Refresh the list
      alert('Player deleted successfully!');
    } catch (err) {
      console.error('Error deleting player:', err);
      alert('Failed to delete player. They may have match history.');
    }
  };

  if (loading) return <div className="loading">Loading players...</div>;

  return (
    <div className="player-management-container">
      <div className="header-section">
        <h2>Player Management</h2>
        <button className="add-btn" onClick={handleAddNew}>
          + Add New Player
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>{editingPlayer ? 'Edit Player' : 'Add New Player'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter player name"
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select Gender</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>

              <div className="form-group">
                <label>Initial Rating</label>
                <input
                  type="number"
                  name="initialRating"
                  value={formData.initialRating}
                  onChange={handleInputChange}
                  min="0"
                  max="3000"
                  disabled={editingPlayer && playerMatchHistory[editingPlayer.id]}
                />
                {editingPlayer && playerMatchHistory[editingPlayer.id] && (
                  <small style={{color: '#dc3545'}}>Cannot edit - player has match history</small>
                )}
              </div>

              <div className="form-group">
                <label>Current Rating</label>
                <input
                  type="number"
                  name="currentRating"
                  value={formData.currentRating}
                  onChange={handleInputChange}
                  min="0"
                  max="3000"
                  disabled={editingPlayer && playerMatchHistory[editingPlayer.id]}
                />
                {editingPlayer && playerMatchHistory[editingPlayer.id] && (
                  <small style={{color: '#dc3545'}}>Cannot edit - player has match history</small>
                )}
              </div>

              <div className="form-group">
                <label>Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  disabled={editingPlayer && playerMatchHistory[editingPlayer.id]}
                />
                {editingPlayer && playerMatchHistory[editingPlayer.id] && (
                  <small style={{color: '#dc3545'}}>Cannot edit - player has match history</small>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : (editingPlayer ? 'Update Player' : 'Add Player')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="players-list">
        <div className="players-header">
          <span>Total Players: {players.length}</span>
        </div>
        
        <div className="players-table-container">
          <table className="players-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Current Rating</th>
                <th>Initial Rating</th>
                <th>Joining Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr key={player.id}>
                  <td>{index + 1}</td>
                  <td className="player-name">{player.name}</td>
                  <td>{player.gender || '-'}</td>
                  <td className="rating">{player.currentRating}</td>
                  <td className="rating">{player.initialRating}</td>
                  <td>{player.joiningDate ? new Date(player.joiningDate).toLocaleDateString() : '-'}</td>
                  <td className="actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(player)}
                      title="Edit player"
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(player)}
                      title={playerMatchHistory[player.id] ? "Cannot delete - has match history" : "Delete player"}
                      disabled={playerMatchHistory[player.id]}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PlayerManagement;
