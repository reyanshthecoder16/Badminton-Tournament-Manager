import React, { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

function defaultMultiSort(a, b) {
  const dateA = a.date || '';
  const dateB = b.date || '';
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  const courtA = a.court || 0;
  const courtB = b.court || 0;
  if (courtA < courtB) return -1;
  if (courtA > courtB) return 1;
  const idA = a.id || 0;
  const idB = b.id || 0;
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
}

function MatchResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [inputs, setInputs] = useState({});
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [changed, setChanged] = useState({}); // Track changed matches
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [message, setMessage] = useState(null); // For displaying success/error messages

  // Function to display a temporary message
  const displayMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/results/matches');
      const data = await res.json();
      setMatches(data);
      const initialInputs = {};
      data.forEach(match => {
        initialInputs[match.id] = {
          winnerTeam: getWinnerTeam(match),
          scoreInput: match.score || ''
        };
      });
      setInputs(initialInputs);
      setChanged({}); // Reset changed status on fetch
    } catch (err) {
      setError('Failed to fetch matches.');
      displayMessage('Failed to fetch matches.', 'error');
    }
    setLoading(false);
  };

  function getWinnerTeam(match) {
    if (!match.winnerIds || match.winnerIds.length === 0) return '';
    const winnerIds = match.winnerIds.sort().join(',');
    if ((match.team1Players || []).map(p => p.id).sort().join(',') === winnerIds) return 'team1';
    if ((match.team2Players || []).map(p => p.id).sort().join(',') === winnerIds) return 'team2';
    return '';
  }

  const handleInputChange = (matchId, field, value) => {
    setInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
    setChanged(prev => ({ ...prev, [matchId]: true }));
  };

  const handleUpdate = async (matchId, match) => {
    setUpdating(prev => ({ ...prev, [matchId]: true }));
    const { winnerTeam, scoreInput } = inputs[matchId];
    let winnerIds = [];
    if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
    else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winnerIds, score: scoreInput })
      });
      if (!res.ok) throw new Error('Failed to update result');
      await fetchMatches(); // Re-fetch all matches to ensure data consistency
      displayMessage('Result updated successfully!', 'success');
    } catch (err) {
      displayMessage('Failed to update result.', 'error');
    }
    setUpdating(prev => ({ ...prev, [matchId]: false }));
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    const updates = Object.keys(changed).map(matchId => {
      const match = matches.find(m => m.id === Number(matchId));
      const { winnerTeam, scoreInput } = inputs[matchId];
      let winnerIds = [];
      if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
      else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
      return { matchId: Number(matchId), winnerIds, score: scoreInput };
    });

    try {
      await Promise.all(updates.map(update =>
        fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      ));
      await fetchMatches();
      displayMessage('All selected results updated!', 'success');
    } catch (err) {
      displayMessage('Failed to update some results.', 'error');
    }
    setBulkUpdating(false);
  };

  const handleForceBulkUpdate = async () => {
    setBulkUpdating(true);
    const updates = matches.map(match => {
      const { winnerTeam, scoreInput } = inputs[match.id];
      let winnerIds = [];
      if (winnerTeam === 'team1') winnerIds = (match.team1Players || []).map(p => p.id);
      else if (winnerTeam === 'team2') winnerIds = (match.team2Players || []).map(p => p.id);
      return { matchId: match.id, winnerIds, score: scoreInput };
    });
    try {
      await Promise.all(updates.map(update =>
        fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      ));
      await fetchMatches();
      displayMessage('All records force updated!', 'success');
    } catch (err) {
      displayMessage('Failed to force update some results.', 'error');
    }
    setBulkUpdating(false);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  function getSortedMatches() {
    const sorted = [...matches];
    if (!sortBy) {
      sorted.sort(defaultMultiSort);
      return sorted;
    }
    sorted.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'date') {
        valA = a.date || '';
        valB = b.date || '';
      } else if (sortBy === 'court') {
        valA = a.court || 0;
        valB = b.court || 0;
      } else if (sortBy === 'matchCode') {
        valA = a.matchCode || '';
        valB = b.matchCode || '';
      } else if (sortBy === 'id') {
        valA = a.id || 0;
        valB = b.id || 0;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  if (loading) return <div className="text-center text-lg mt-10">Loading matches...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
  if (!matches.length) return <div className="text-center text-lg mt-10">No matches found.</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-6">Update Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Display */}
          {message && (
            <div className={`p-3 mb-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
            <span className="font-medium">Sort by:</span>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              onClick={() => handleSort('date')}
              className="px-4 py-2"
            >
              Date {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
            </Button>
            <Button
              variant={sortBy === 'court' ? 'default' : 'outline'}
              onClick={() => handleSort('court')}
              className="px-4 py-2"
            >
              Court {sortBy === 'court' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
            </Button>
            <Button
              variant={sortBy === 'id' ? 'default' : 'outline'}
              onClick={() => handleSort('id')}
              className="px-4 py-2"
            >
              ID {sortBy === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
            </Button>
            <Button
              variant={sortBy === 'matchCode' ? 'default' : 'outline'}
              onClick={() => handleSort('matchCode')}
              className="px-4 py-2"
            >
              Match {sortBy === 'matchCode' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
            </Button>
            {sortBy && (
              <Button variant="outline" onClick={() => setSortBy('')} className="px-4 py-2">
                Reset
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-3 mb-6">
            <Button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating || Object.keys(changed).length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out"
            >
              {bulkUpdating ? 'Updating All...' : `Update Selected (${Object.keys(changed).length})`}
            </Button>
            <Button
              onClick={handleForceBulkUpdate}
              disabled={bulkUpdating}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out"
            >
              {bulkUpdating ? 'Force Updating...' : 'Force Update All'}
            </Button>
          </div>

          <Table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead colSpan={2}>Teams</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedMatches().map(match => {
                const team1 = match.team1Players || [];
                const team2 = match.team2Players || [];
                return (
                  <TableRow key={match.id} className="border-b last:border-0 hover:bg-gray-50">
                    <TableCell className="font-medium">{match.id}</TableCell>
                    <TableCell>{match.date ? match.date.slice(0, 10) : ''}</TableCell>
                    <TableCell>{match.court || ''}</TableCell>
                    <TableCell>{match.matchCode || ''}</TableCell>
                    <TableCell>{match.matchType || ''}</TableCell>
                    <TableCell>
                      <b className="block text-left mb-1">Team 1</b>
                      <ul className="list-disc list-inside text-left pl-2">
                        {team1.map(p => <li key={p.id}>{p.name} (ID: {p.id})</li>)}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <b className="block text-left mb-1">Team 2</b>
                      <ul className="list-disc list-inside text-left pl-2">
                        {team2.map(p => <li key={p.id}>{p.name} (ID: {p.id})</li>)}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={inputs[match.id]?.winnerTeam === 'team1' ? 'default' : 'outline'}
                          onClick={() => handleInputChange(match.id, 'winnerTeam', 'team1')}
                          className="w-full"
                        >
                          Team 1
                        </Button>
                        <Button
                          variant={inputs[match.id]?.winnerTeam === 'team2' ? 'default' : 'outline'}
                          onClick={() => handleInputChange(match.id, 'winnerTeam', 'team2')}
                          className="w-full"
                        >
                          Team 2
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={inputs[match.id]?.scoreInput || ''}
                        onChange={e => handleInputChange(match.id, 'scoreInput', e.target.value)}
                        placeholder="Score"
                        className="w-24 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleUpdate(match.id, match)}
                        disabled={updating[match.id]}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {updating[match.id] ? 'Updating...' : 'Update'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default MatchResults;
