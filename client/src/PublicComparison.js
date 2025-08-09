import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PlayerSelector from './PlayerSelector';
import { api } from './utils/api';

/**
 * PublicComparison – public-facing screen to compare performance trends of multiple players.
 * Uses Recharts to render an interactive line chart of rating vs date.
 */
export default function PublicComparison() {
  const [allPlayers, setAllPlayers] = useState([]);        // [{id, name, snapshots: [{date,rating}]}]
  const [selectedIds, setSelectedIds] = useState([]);      // player ids selected in UI
  const [chartData, setChartData] = useState([]);          // array for Recharts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredName, setHoveredName] = useState(null);    // legend hover highlight

  // Fetch snapshot data once
  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        const data = await api.getPublicSnapshots();
        setAllPlayers(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load player data');
      }
      setLoading(false);
    };
    fetchSnapshots();
  }, []);

  // Recompute chart data when selection changes or data loads
  useEffect(() => {
    if (selectedIds.length === 0 || allPlayers.length === 0) {
      setChartData([]);
      return;
    }

    // Collect all unique dates across selected players
    const dateSet = new Set();
    selectedIds.forEach(id => {
      const p = allPlayers.find(pl => pl.id === id);
      if (p) p.snapshots.forEach(s => dateSet.add(s.date));
    });
    const allDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));

    // Build chart rows starting with baseline Initial ratings
    const rows = [];
    const baseline = { date: 'Initial' };
    selectedIds.forEach(id => {
      const p = allPlayers.find(pl => pl.id === id);
      if (p) baseline[p.name] = p.initialRating;
    });
    rows.push(baseline);

    allDates.forEach(dateStr => {
      const row = { date: new Date(dateStr).toLocaleDateString() };
      selectedIds.forEach(id => {
        const p = allPlayers.find(pl => pl.id === id);
        if (!p) return;
        const snap = p.snapshots.find(s => s.date === dateStr);
        row[p.name] = snap ? snap.rating : null;
      });
      rows.push(row);
    });
    setChartData(rows);
  }, [selectedIds, allPlayers]);

  // Compute Y-axis domain to reduce dead space and auto-zoom when 1-2 players are selected
  const yDomain = useMemo(() => {
    if (chartData.length === 0 || selectedIds.length === 0) return ['auto', 'auto'];
    // Keys are player names
    const selectedNames = selectedIds
      .map(id => allPlayers.find(p => p.id === id)?.name)
      .filter(Boolean);
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    // Ignore the baseline "Initial" row for zooming calculations
    for (const row of chartData) {
      if (row.date === 'Initial') continue;
      for (const name of selectedNames) {
        const v = row[name];
        if (typeof v === 'number') {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
    }
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return ['auto', 'auto'];
    // If 1-2 players and the range is tight, zoom in
    const range = maxVal - minVal;
    const isFewPlayers = selectedIds.length <= 2;
    if (isFewPlayers) {
      const minPad = 5;
      const pad = Math.max(minPad, Math.round(range * 0.15));
      return [Math.max(0, minVal - pad), maxVal + pad];
    }
    // For more players, keep a modest padding
    const pad = Math.max(10, Math.round((maxVal - minVal) * 0.1));
    return [Math.max(0, minVal - pad), maxVal + pad];
  }, [chartData, selectedIds, allPlayers]);

  // Distinct, colorblind-friendly palette + dash patterns for extra differentiation
  const palette = ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d','#666666','#1f78b4','#b15928'];
  const patterns = ['0','6 4','3 3','10 5','2 6','8 4 2 4'];

  const selectedNames = useMemo(() => selectedIds
    .map(id => allPlayers.find(p => p.id === id)?.name)
    .filter(Boolean), [selectedIds, allPlayers]);

  const lineStyles = useMemo(() => {
    const map = {};
    selectedNames.forEach((name, idx) => {
      const color = palette[idx % palette.length] || stringToHslColor(name, 70, 45);
      const dash = patterns[idx % patterns.length];
      map[name] = { color, dash };
    });
    return map;
  }, [selectedNames]);

  const handleSelectionChange = ids => setSelectedIds(ids);

  if (loading) return <div style={{padding:20}}>Loading...</div>;
  if (error) return <div style={{padding:20,color:'red'}}>{error}</div>;

  return (
    <div className="comparison-container" style={{maxWidth:1100, margin:'0 auto', padding:12}}>

      <PlayerSelector
        players={allPlayers.map(({id,name})=>({id,name}))}
        selected={selectedIds}
        onChange={handleSelectionChange}
        max={5}
        label="Select players to compare (up to 5)"
        maxHeight={90}
      />

      {chartData.length > 0 ? (
        <div style={{width:'100%', height:380, marginTop:12}}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
              <XAxis dataKey="date" angle={-30} textAnchor="end" height={48} tickMargin={6} />
              <YAxis domain={yDomain} tickMargin={6} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: '0.9rem', borderRadius: 8 }} />
              <Legend
                wrapperStyle={{ fontSize: '0.9rem' }}
                content={() => (
                  <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', padding:'6px 0'}}>
                    {selectedNames.map((name, idx) => {
                      const { color, dash } = lineStyles[name] || {};
                      const isActive = !hoveredName || hoveredName === name;
                      return (
                        <div
                          key={name}
                          onMouseEnter={() => setHoveredName(name)}
                          onMouseLeave={() => setHoveredName(null)}
                          style={{
                            display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                            padding:'4px 8px', borderRadius:8, background:isActive?'#f3f4f6':'#fafafa',
                            border:'1px solid #e5e7eb'
                          }}
                          title={name}
                        >
                          <span style={{width:22}}>
                            <svg width="22" height="10">
                              <line x1="0" y1="5" x2="22" y2="5" stroke={color} strokeWidth="3" strokeDasharray={dash} />
                            </svg>
                          </span>
                          <span style={{whiteSpace:'nowrap'}}>{name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
              {selectedIds.map(id => {
                const player = allPlayers.find(p => p.id === id);
                if (!player) return null;
                const style = lineStyles[player.name] || {};
                const isFaded = hoveredName && hoveredName !== player.name;
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={style.color}
                    strokeDasharray={style.dash}
                    strokeWidth={2.5}
                    strokeOpacity={isFaded ? 0.25 : 1}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p style={{textAlign:'center', marginTop:24}}>Select at least one player to view the chart.</p>
      )}
    </div>
  );
}

// Helper to generate deterministic color from string
function stringToHslColor(str, s, l) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
