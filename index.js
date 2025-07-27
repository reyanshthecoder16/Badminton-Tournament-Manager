const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const Player = require('./models/Player');
const User = require('./models/User');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const xlsx = require('xlsx');
const { authenticateToken } = require('./middleware/auth');

const authRoute = require('./routes/auth');
const publicRoute = require('./routes/public');
const playersRoute = require('./routes/players');
const attendanceRoute = require('./routes/attendance');
const scheduleRoute = require('./routes/schedule');
const resultsRoute = require('./routes/results');

const app = express();

// Trust proxy for rate limiting (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'client')));

// Admin route handler
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Mount public routes (no authentication required)
app.use('/api/public', publicRoute);

// Mount authentication routes (unprotected)
app.use('/api/auth', authRoute);

// Mount protected routes
app.use('/api/players', authenticateToken, playersRoute);
app.use('/api/attendance', authenticateToken, attendanceRoute);
app.use('/api/schedule', authenticateToken, scheduleRoute);
app.use('/api/results', authenticateToken, resultsRoute);

// Swagger setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Badminton Scheduler API',
    version: '1.0.0',
    description: 'API documentation for Badminton Scheduler',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{
    bearerAuth: [],
  }],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Path to the API docs
};
const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Create default admin user
async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@badminton.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Default admin user created: admin/admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

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
  await createDefaultAdmin();
  await importSamplePlayers();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});