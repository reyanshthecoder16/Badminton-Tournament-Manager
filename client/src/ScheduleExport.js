import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

function ScheduleExport({ players }) {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); // For displaying success/error messages

  // Function to display a temporary message
  const displayMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
  };

  // Helper to get player name by ID
  const playerNameById = (id) => {
    if (!players) return id;
    const p = players.find(p => p.id === id);
    return p ? p.name : id;
  };

  // Helper to download PDF for a court
  const downloadCourtPDF = (court) => {
    // Defensive: sort matches by id ascending before export
    const sortedMatches = [...court.matches].sort((a, b) => a.id - b.id);
    const doc = new jsPDF();
    doc.text(`Court ${court.court} Schedule - Match Day: ${selectedMatchDay}`, 14, 16);
    const rows = sortedMatches.map(match => [
      match.matchCode,
      match.matchType,
      (match.team1Names || (match.team1 || []).map(playerNameById)).join(', '),
      (match.team2Names || (match.team2 || []).map(playerNameById)).join(', '),
      match.score || '' // Ensure score is included
    ]);
    autoTable(doc, {
      head: [['Match Code', 'Type', 'Team 1', 'Team 2', 'Score']],
      body: rows,
      startY: 22,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [70, 202, 255] }
    });
    doc.save(`court_${court.court}_schedule.pdf`);
    displayMessage(`Schedule for Court ${court.court} downloaded successfully.`, 'success');
  };

  useEffect(() => {
    // Fetch all match days for dropdown
    fetch('/api/schedule/matchdays')
      .then(res => res.json())
      .then(setMatchDays)
      .catch(() => {
        setError('Failed to load match days.');
        displayMessage('Failed to load match days.', 'error');
      });
  }, []);

  const handleSelect = async (matchDayId) => {
    setSelectedMatchDay(matchDayId);
    setError(null);
    setSchedule(null);
    if (!matchDayId) return;
    try {
      const res = await fetch(`/api/schedule/${matchDayId}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const data = await res.json();
      setSchedule(data);
      if (data.length === 0) {
        setError('No schedule found for the selected match day.');
        displayMessage('No schedule found for the selected match day.', 'error');
        return;
      }
      displayMessage('Schedule for the selected match day loaded successfully.', 'success');
    } catch (e) {
      setError('Failed to fetch schedule.');
      displayMessage('Failed to fetch schedule.', 'error');
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-6">Export/Print Schedule Per Court</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Display */}
          {message && (
            <div className={`p-3 mb-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <div className="mb-6">
            <Label htmlFor="matchday-select" className="text-lg font-medium mb-2 block">Select Match Day:</Label>
            <Select onValueChange={handleSelect} value={selectedMatchDay}>
              <SelectTrigger id="matchday-select" className="w-full">
                <SelectValue placeholder="-- Select --" />
              </SelectTrigger>
              <SelectContent>
                {matchDays.map(md => (
                  <SelectItem key={md.id} value={md.id}>{md.date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          </div>
          {schedule && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-center">Schedule Per Court</h3>
              {schedule.map((court, idx) => {
                // Defensive: sort matches by id before rendering
                const sortedMatches = [...court.matches].sort((a, b) => a.id - b.id);
                return (
                  <Card key={court.court || idx} className="mb-6 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-semibold">Court {court.court}</CardTitle>
                      <Button
                        onClick={() => downloadCourtPDF(court)}
                        className="bg-blue-500 hover:bg-blue-600 text-black text-sm px-3 py-1 rounded-md"
                      >
                        Download PDF
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table className="w-full border border-gray-200 rounded-md">
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead>Match Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Team 1</TableHead>
                            <TableHead>Team 2</TableHead>
                            <TableHead>Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedMatches.map(match => (
                            <TableRow key={match.id} className="border-b last:border-0 hover:bg-gray-50">
                              <TableCell className="font-medium">{match.matchCode}</TableCell>
                              <TableCell>{match.matchType}</TableCell>
                              <TableCell>{(match.team1Names || (match.team1 || []).map(pid => playerNameById(pid))).join(', ')}</TableCell>
                              <TableCell>{(match.team2Names || (match.team2 || []).map(pid => playerNameById(pid))).join(', ')}</TableCell>
                              <TableCell className="min-w-[80px]">{match.score}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
              <Button onClick={() => window.print()} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out">
                Print This Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ScheduleExport;
