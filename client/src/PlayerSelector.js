
/**
 * PlayerSelector - a reusable component for selecting players for a team.
 * Props:
 *   players: array of all players [{id, name}]
 *   selected: array of selected player ids
 *   onChange: function(newSelectedIds)
 *   max: max number of players selectable (optional)
 *   label: string (optional)
 */
import React, { useState } from 'react';

export default function PlayerSelector({ players, selected, onChange, max, label }) {
  const [search, setSearch] = useState('');
  const handleToggle = (id) => {
    let newSelected;
    if (selected.includes(id)) {
      newSelected = selected.filter(pid => pid !== id);
    } else {
      if (max && selected.length >= max) return;
      newSelected = [...selected, id];
    }
    onChange(newSelected);
  };
  const filteredPlayers = players.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="player-selector">
      {label && <div className="player-selector-label">{label}</div>}
      <input
        className="player-selector-search"
        type="text"
        placeholder="Search players by name or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{marginBottom:8, width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid #cfd8dc', fontSize:'1em'}}
      />
      <div className="player-selector-list">
        {filteredPlayers.map(player => (
          <label key={player.id} className="player-selector-item">
            <input
              type="checkbox"
              checked={selected.includes(player.id)}
              onChange={() => handleToggle(player.id)}
              disabled={max && !selected.includes(player.id) && selected.length >= max}
            />
            <span className="player-selector-name">{player.name}</span>
            <span className="player-selector-id">({player.id})</span>
          </label>
        ))}
      </div>
      <style>{`
        .player-selector-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
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
        }
        .player-selector-label {
          font-weight: 600;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}
