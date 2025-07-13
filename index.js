const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');
const Player = require('./models/Player');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const xlsx = require('xlsx');

const playersRoute = require('./routes/players');
const attendanceRoute = require('./routes/attendance');
const scheduleRoute = require('./routes/schedule');
const resultsRoute = require('./routes/results');

const app = express();
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'client')));

// Mount routes
app.use('/api/players', playersRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/schedule', scheduleRoute);
app.use('/api/results', resultsRoute);

// Swagger setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Badminton Scheduler API',
    version: '1.0.0',
    description: 'API documentation for Badminton Scheduler',
  },
  servers: [{ url: '  http://localhost:3000' }],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Path to the API docs
};
const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import sample data from Excel
async function importSamplePlayers() {
  const excelPath = path.join(__dirname, 'MBPL Season 1.0.xlsx');
  if (!fs.existsSync(excelPath)) return;
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Manually set the headers you want to use
  const headers = [
    'Rank', 'Latest Rating Points', 'Player Name', 'Initial Rating', 'Current Rating', 'Joining Date',
    'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
  ];

  // Read the data, skipping the first row (header)
  const rows = xlsx.utils.sheet_to_json(sheet, { header: headers, range: 1, defval: '' });

  const players = [];
  for (const row of rows) {
    console.log("row is:-"+ row);
    const name = row['Player Name']?.toString().trim();
    const initialRating = Number(row['Initial Rating']);
    const currentRating = Number(row['Current Rating']);
    let joiningDate = row['Joining Date'];
    console.log("joiningDate is:-"+ joiningDate);
    // Parse joining date in DD-MMM-YY format (e.g., 12-Jul-25)
    if (typeof joiningDate === 'string' && joiningDate.match(/^\d{1,2}-[A-Za-z]{3}-\d{2}$/)) {
      const [day, mon, year] = joiningDate.split('-');
      const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
      joiningDate = `20${year}-${monthMap[mon]}-${day.padStart(2, '0')}`;
    } else if (joiningDate instanceof Date) {
      joiningDate = joiningDate.toISOString().slice(0, 10);
    }
   console.log("name is:-"+ name + " initialRating is:-" + 
    initialRating + " currentRating is:-" + currentRating +
     " joiningDate is:-" + joiningDate);
     console.log(isNaN(initialRating), isNaN(currentRating), isNaN(joiningDate));
    if (name && !isNaN(initialRating) && !isNaN(currentRating) && joiningDate) {
      players.push({ name, initialRating, currentRating, joiningDate });
      console.log('Loaded player:', { name, initialRating, currentRating, joiningDate });
    } else {
      console.log('Skipped row:', row);
    }
  }
  const count = await Player.count();
  if (players.length && count === 0) {
    await Player.bulkCreate(players);
    console.log('Sample players imported from Excel');
  } else if (!players.length) {
    console.log('No valid players found in Excel.');
  } else {
    console.log('Players already exist in DB, skipping import.');
  }
}

// Sync DB and start server
db.sync({ alter: true }).then(async () => {
  await importSamplePlayers();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});