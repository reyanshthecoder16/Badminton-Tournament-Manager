import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

function FinalizeMatches() {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/schedule/matchdays')
      .then(res => res.json())
      .then(setMatchDays)
      .catch(() => setStatus('Failed to load match days'));
  }, []);

  const handleFinalize = async () => {
    if (!selectedMatchDay) {
      setStatus('Error: Please select a match day.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/results/finalizeMatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchDayId: selectedMatchDay })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('Success: ' + (data.message || 'Matches finalized.'));
      } else {
        setStatus('Error: ' + (data.error || 'Failed to finalize matches.'));
      }
    } catch (e) {
      setStatus('Error: Failed to finalize matches.');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-md">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-4">Finalize Matches & Update Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="matchday-select" className="text-lg font-medium mb-2 block">Select Match Day:</Label>
            <Select onValueChange={setSelectedMatchDay} value={selectedMatchDay}>
              <SelectTrigger id="matchday-select" className="w-full">
                <SelectValue placeholder="-- Select --" />
              </SelectTrigger>
              <SelectContent>
                {matchDays.map(md => (
                  <SelectItem key={md.id} value={md.id}>{md.date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleFinalize}
            disabled={!selectedMatchDay || loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out"
          >
            {loading ? 'Finalizing...' : 'Finalize Matches'}
          </Button>
          {status && (
            <div className={`mt-4 text-center text-sm font-medium ${status.startsWith('Success') ? 'text-green-600' : 'text-red-600'}`}>
              {status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FinalizeMatches;
