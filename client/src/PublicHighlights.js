import React, { useEffect, useMemo, useState } from 'react';
import { api } from './utils/api';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function PublicHighlights() {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }, []);

  useEffect(() => {
    const fetchDays = async () => {
      try {
        const days = await api.getPublicMatchDays();
        // backend returns array with objects having match_day
        const onlyDates = days
          .map(d => d.match_day || d.date || d)
          .filter(Boolean)
          .map(formatDate);
        // unique and sorted desc already from API
        setMatchDays(onlyDates);
        if (onlyDates.length > 0) setSelectedDay(onlyDates[0]);
      } catch (e) {
        console.error(e);
        setError('Failed to load match days');
      }
    };
    fetchDays();
  }, []);

  useEffect(() => {
    if (!selectedDay) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPublicHighlights(selectedDay, limit);
        setData(res);
      } catch (e) {
        console.error(e);
        setError('Failed to load highlights');
      }
      setLoading(false);
    };
    load();
  }, [selectedDay, limit]);

  return (
    <div className="highlights-container">
      <div className="controls">
        <div className="control">
          <label>Date</label>
          <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
            {matchDays.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>Items</label>
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value, 10))}>
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading">Loading highlights...</div>
      )}
      {error && (
        <div className="error">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="sections-grid">
          <section className="card">
            <h3>Top Risers</h3>
            <ul className="list">
              {data.topGainers.length === 0 && <li className="muted">No data</li>}
              {data.topGainers.map((p, idx) => (
                <li key={p.player_id} className="row">
                  <span className="rank">#{idx + 1}</span>
                  <span className="name">{p.name}</span>
                  <span className="delta positive">+{p.rating_change}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3>Top Fallers</h3>
            <ul className="list">
              {data.topLosers.length === 0 && <li className="muted">No data</li>}
              {data.topLosers.map((p, idx) => (
                <li key={p.player_id} className="row">
                  <span className="rank">#{idx + 1}</span>
                  <span className="name">{p.name}</span>
                  <span className="delta negative">{p.rating_change}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card wide">
            <h3>Closest Thrillers</h3>
            <ul className="list">
              {data.closestMatches.length === 0 && <li className="muted">No scored matches</li>}
              {data.closestMatches.map((m, idx) => (
                <li key={m.id} className="row multi">
                  <div className="rank">#{idx + 1}</div>
                  <div className="teams">
                    <div className="team">{m.team1Names.join(' / ') || 'Team 1'}</div>
                    <div className="vs">vs</div>
                    <div className="team">{m.team2Names.join(' / ') || 'Team 2'}</div>
                  </div>
                  <div className="score">
                    <span className="badge">{m.score}</span>
                    <span className="sub muted">Total margin: {m.marginSum}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card wide">
            <h3>One-sided Wins</h3>
            <ul className="list">
              {data.oneSidedMatches.length === 0 && <li className="muted">No scored matches</li>}
              {data.oneSidedMatches.map((m, idx) => (
                <li key={m.id} className="row multi">
                  <div className="rank">#{idx + 1}</div>
                  <div className="teams">
                    <div className="team">{m.team1Names.join(' / ') || 'Team 1'}</div>
                    <div className="vs">vs</div>
                    <div className="team">{m.team2Names.join(' / ') || 'Team 2'}</div>
                  </div>
                  <div className="score">
                    <span className="badge badge-red">{m.score}</span>
                    <span className="sub muted">Total margin: {m.marginSum}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <style>{`
        .highlights-container { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
        .controls { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 16px; }
        .control { display: flex; align-items: center; gap: 8px; background: #f7f9fc; padding: 8px 12px; border-radius: 8px; }
        .control label { font-weight: 600; }
        .control select { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; background: white; }

        .loading, .error { text-align: center; margin: 16px 0; }
        .error { color: #c62828; }

        .sections-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 14px rgba(0,0,0,0.08); padding: 16px; }
        .card h3 { margin: 4px 0 12px; font-size: 1.06rem; }
        .card.wide { grid-column: span 2; }

        .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .row { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #eef2f7; border-radius: 10px; }
        .row.multi { grid-template-columns: 40px 1fr auto; }
        .rank { width: 32px; height: 32px; border-radius: 8px; background: #f1f5ff; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #3056d3; }
        .name { font-weight: 600; }
        .delta { font-weight: 700; }
        .delta.positive { color: #2e7d32; }
        .delta.negative { color: #c62828; }
        .muted { color: #757575; }

        .teams { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .team { font-weight: 600; }
        .vs { color: #9e9e9e; font-weight: 700; }
        .score { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .badge { background: #e8f5e9; color: #2e7d32; border-radius: 16px; padding: 4px 10px; font-weight: 700; }
        .badge-red { background: #ffebee; color: #c62828; }
        .sub { font-size: 0.85rem; }

        @media (max-width: 768px) {
          .sections-grid { grid-template-columns: 1fr; }
          .card.wide { grid-column: span 1; }
          .row { grid-template-columns: 32px 1fr auto; }
        }
      `}</style>
    </div>
  );
}

export default PublicHighlights;


