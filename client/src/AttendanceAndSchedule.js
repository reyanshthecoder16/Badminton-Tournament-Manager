import React, { useEffect, useState } from 'react';
import { Button } from './components/ui/button'; // Assuming Shadcn UI components are available at this path
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Checkbox } from './components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './components/ui/card';

function AttendanceAndSchedule() {
  const [players, setPlayers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [message, setMessage] = useState(null); // For displaying success/error messages
  // Function to display a temporary message
  const displayMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
  };

  useEffect(() => {
    fetchPlayers();
    fetchSchedule();
  }, []);

  useEffect(() => {
    if (date && players.length > 0) {
      fetchAttendanceForDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, players]);


  const fetchAttendanceForDate = async () => {
    try {
      const res = await fetch(`/api/attendance/${date}`);
      const data = await res.json();
      const att = {};
      if (data.length > 0) {
        // If there are records, populate from them
        const attendanceByPlayerId = data.reduce((acc, a) => {
          acc[a.PlayerId] = a.present;
          return acc;
        }, {});
        players.forEach(p => {
          att[p.id] = !!attendanceByPlayerId[p.id]; // Default to false if not in record
        });
      } else {
        // If no records, default to all absent
        players.forEach(p => {
          att[p.id] = true;
        });
      }
      setAttendance(att);
    } catch (err) {
      setError('Failed to fetch attendance.');
      displayMessage('Failed to fetch attendance.', 'error');
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      setError('Failed to fetch players.');
      displayMessage('Failed to fetch players.', 'error');
    }
    setLoading(false);
  };

  const handleToggle = (id) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const attArr = players.map(p => ({
        playerId: p.id,
        present: !!attendance[p.id],
        date
      }));
      await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attArr })
      });
      displayMessage('Attendance saved successfully!', 'success');
    } catch (err) {
      displayMessage('Failed to save attendance.', 'error');
    }
    setSaving(false);
  };

  const handleGenerateSchedule = async () => {
    setSchedule(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      setSchedule(res.json());
      displayMessage('Schedule generated successfully!', 'success');
    } catch (err) {
      displayMessage('Failed to generate schedule.', 'error');
    }
  };

  const fetchSchedule = async () => {
    // Get matchDayId for the selected date
    const matchDayId = await getMatchDayIdForDate(date);
    if (!matchDayId) {
      setSchedule([]);
      return;
    }
    const res = await fetch(`/api/schedule/${matchDayId}`);
    const data = await res.json();
    setSchedule(data);
  };

  // Helper to get player names by ID
  const playerNameById = (id) => {
    const p = players.find(p => p.id === id);
    return p ? p.name : id;
  };

  // Helper to get matchDayId for the selected date
  const getMatchDayIdForDate = async (date) => {
    const res = await fetch('/api/schedule/matchdays');
    const matchDays = await res.json();
    const md = matchDays.find(md => md.date === date);
    return md ? md.id : null;
  };

  // Helper to render exportable schedule per court
  const renderExportSchedule = () => {
    if (!schedule) return null;
    return (
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4">Schedule Per Court</h3>
        {schedule.map((court, idx) => (
          <Card key={court.court || idx} className="mb-6 shadow-sm">
            <CardHeader>
              <CardTitle>Court {court.court}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Match Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Players</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {court.matches.map(match => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.matchCode}</TableCell>
                      <TableCell>{match.matchType}</TableCell>
                      <TableCell>
                        {[...(match.team1 || []), ...(match.team2 || [])]
                          .map(pid => playerNameById(pid)).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        <Button onClick={() => window.print()} className="w-full mt-4">
          Print This Page
        </Button>
      </div>
    );
  };

  if (loading) return <div className="text-center text-lg mt-10">Loading players...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-6">Player Attendance & Match Scheduling</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Display */}
          {message && (
            <div className={`p-3 mb-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <div className="mb-6 flex items-center space-x-4">
            <Label htmlFor="date" className="text-lg font-medium">Date:</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-grow max-w-xs rounded-md"
            />
          </div>

          <Table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="w-1/2 text-left px-4 py-3 font-semibold text-gray-700">Name</TableHead>
                <TableHead className="w-1/2 text-center px-4 py-3 font-semibold text-gray-700">Present?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(p => (
                <TableRow key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <TableCell className="px-4 py-3">{p.name}</TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <Checkbox
                      checked={!!attendance[p.id]}
                      onCheckedChange={() => handleToggle(p.id)}
                      className="h-5 w-5"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end space-x-4">
            <Button onClick={handleSaveAttendance} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out">
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
            <Button onClick={handleGenerateSchedule} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out">
              Generate Schedule
            </Button>
          </div>

          {Array.isArray(schedule) && schedule.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-bold mb-4">Generated Schedule</h3>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this schedule?')) {
                    try {
                      const matchDayId = await getMatchDayIdForDate(date);
                      if (!matchDayId) {
                        displayMessage('No schedule found for this date.', 'error');
                        return;
                      }
                      const res = await fetch(`/api/schedule/${matchDayId}`, { method: 'DELETE' });
                      const data = await res.json();
                      if (res.ok) {
                        setSchedule([]);
                        displayMessage('Schedule deleted successfully!', 'success');
                      } else {
                        displayMessage(data.error || 'Failed to delete schedule.', 'error');
                      }
                    } catch {
                      displayMessage('Failed to delete schedule.', 'error');
                    }
                  }
                }}
                className="mb-4"
              >
                Delete Schedule
              </Button>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-80 border border-gray-200">
                {JSON.stringify(schedule, null, 2)}
              </pre>
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out">
                    Export Schedule per Court
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Export Schedule</DialogTitle>
                    <DialogDescription>
                      Here is the detailed schedule per court, ready for export or printing.
                    </DialogDescription>
                  </DialogHeader>
                  {renderExportSchedule()}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceAndSchedule;
