
/**
 * PlayerSelector - a reusable component for selecting players for a team.
 * Props:
 *   players: array of all players [{id, name}]
 *   selected: array of selected player ids
 *   onChange: function(newSelectedIds)
 *   max: max number of players selectable (optional)
 *   label: string (optional)
 */
import React, { useState, useEffect } from 'react';

export default function PlayerSelector({ players, selected, onChange, max, label, maxHeight }) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState(selected || []);

  // Update local state when selected prop changes
  useEffect(() => {
    setLocalSelected(selected || []);
  }, [selected]);

  const handleToggle = (id) => {
    let newSelected;
    if (localSelected.includes(id)) {
      newSelected = localSelected.filter(pid => pid !== id);
    } else {
      if (max && localSelected.length >= max) {
        alert(`Maximum ${max} players allowed`);
        return;
      }
      newSelected = [...localSelected, id];
    }
    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const handleClear = () => {
    setLocalSelected([]);
    onChange([]);
  };

  const filteredPlayers = players.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="player-selector">
      {label && <div className="player-selector-label">{label}</div>}
      
      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <input
          className="player-selector-search"
          type="text"
          placeholder="Search players by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{flex:1, padding:'6px 10px', borderRadius:6, border:'1px solid #cfd8dc', fontSize:'1em'}}
        />
        <button 
          onClick={handleClear}
          style={{padding:'6px 12px', borderRadius:6, border:'1px solid #ddd', background:'#f0f0f0', cursor:'pointer'}}
        >
          Clear
        </button>
      </div>

      {localSelected.length > 0 && (
        <div style={{marginBottom:8, padding:8, background:'#e8f5e8', borderRadius:6, border:'1px solid #4CAF50'}}>
          <strong>Selected ({localSelected.length}):</strong>
          <div style={{marginTop:4}}>
            {localSelected.map(id => {
              const player = players.find(p => p.id == id);
              return (
                <span key={id} style={{display:'inline-block', margin:'2px 4px', padding:'2px 6px', background:'#4CAF50', color:'white', borderRadius:4, fontSize:'0.8em'}}>
                  {player ? player.name : `Player ${id}`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="player-selector-list" style={maxHeight ? { maxHeight } : undefined}>
        {filteredPlayers.map(player => (
          <label key={player.id} className="player-selector-item">
            <input
              type="checkbox"
              checked={localSelected.includes(player.id)}
              onChange={() => handleToggle(player.id)}
              disabled={max && !localSelected.includes(player.id) && localSelected.length >= max}
            />
            <span className="player-selector-name">{player.name}</span>
            <span className="player-selector-id">({player.id})</span>
          </label>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div style={{textAlign:'center', padding:16, color:'#666'}}>
          No players found matching "{search}"
        </div>
      )}

      <style>{`
        .player-selector-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 8px;
        }
        .player-selector-item {
          background: #f7faff;
          border-radius: 6px;
          padding: 6px 10px;
          border: 1px solid #e1e5e9;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.98em;
          cursor: pointer;
          transition: background 0.2s;
        }
        .player-selector-item:hover {
          background: #e3f2fd;
        }
        .player-selector-item input[type="checkbox"] {
          margin: 0;
        }
        .player-selector-label {
          font-weight: 600;
          margin-bottom: 6px;
        }
        .player-selector-name {
          font-weight: 500;
        }
        .player-selector-id {
          color: #666;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}
