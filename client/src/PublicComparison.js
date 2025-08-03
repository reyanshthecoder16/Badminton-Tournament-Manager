import React, { useEffect, useState } from 'react';
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

  const handleSelectionChange = ids => setSelectedIds(ids);

  if (loading) return <div style={{padding:20}}>Loading...</div>;
  if (error) return <div style={{padding:20,color:'red'}}>{error}</div>;

  return (
    <div className="comparison-container" style={{maxWidth:1000, margin:'0 auto', padding:16}}>
      <h1 style={{textAlign:'center'}}>Compare Player Performance</h1>

      <PlayerSelector
        players={allPlayers.map(({id,name})=>({id,name}))}
        selected={selectedIds}
        onChange={handleSelectionChange}
        max={5}
        label="Select players to compare (up to 5)"
      />

      {chartData.length > 0 ? (
        <div style={{width:'100%', height:400, marginTop:24}}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedIds.map(id => {
                const player = allPlayers.find(p => p.id === id);
                if (!player) return null;
                const color = stringToHslColor(player.name, 50, 50); // deterministic color
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={color}
                    dot={false}
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
