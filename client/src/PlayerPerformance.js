import React, { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

function PlayerPerformance() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState(null); // For displaying success/error messages

  // Function to display a temporary message
  const displayMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/players/performance');
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      setError('Failed to fetch player performance.');
      displayMessage('Failed to fetch player performance.', 'error');
    }
    setLoading(false);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="text-center text-lg mt-10">Loading player performance...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
  if (!players.length) return <div className="text-center text-lg mt-10">No players found.</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-6">Player Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Display */}
          {message && (
            <div className={`p-3 mb-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <Table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Initial Rating</TableHead>
                <TableHead>Current Rating</TableHead>
                <TableHead>Total Points</TableHead>
                <TableHead>Last Rating Updated</TableHead>
                <TableHead>Matches Played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(player => (
                <React.Fragment key={player.id}>
                  <TableRow className="border-b last:border-0 hover:bg-gray-50">
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(player.id)}
                        className="h-8 w-8 p-2"
                      >
                        {expanded[player.id] ? '-' : '+'}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.initialRating}</TableCell>
                    <TableCell>{player.currentRating}</TableCell>
                    <TableCell>{player.totalPoints}</TableCell>
                    <TableCell>{player.lastRatingUpdatedOn ? new Date(player.lastRatingUpdatedOn).toLocaleString() : '—'}</TableCell>
                    <TableCell>{player.matches.length}</TableCell>
                  </TableRow>
                  {expanded[player.id] && (
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={7} className="p-4">
                        <h4 className="text-lg font-semibold mb-3 text-left">Match Details:</h4>
                        <Table className="w-full border border-gray-200 rounded-md">
                          <TableHeader className="bg-gray-100">
                            <TableRow>
                              <TableHead>Match ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Court</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Points</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {player.matches.map(m => (
                              <TableRow key={m.matchId} className="border-b last:border-0 hover:bg-gray-100">
                                <TableCell>{m.matchId}</TableCell>
                                <TableCell>{m.date ? m.date.slice(0, 10) : ''}</TableCell>
                                <TableCell>{m.matchCode}</TableCell>
                                <TableCell>{m.court}</TableCell>
                                <TableCell>{m.score}</TableCell>
                                <TableCell>{m.points}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlayerPerformance;
