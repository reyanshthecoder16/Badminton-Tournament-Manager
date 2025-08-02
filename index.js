const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2500, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 5 requests per windowMs
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
  servers: [
    { url: 'https://your-production-domain.com:8085', description: 'Production HTTPS' },
    { url: 'http://your-production-domain.com:8084', description: 'Production HTTP' },
    { url: 'http://localhost:3001', description: 'Development' }
  ],
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
    // Get admin credentials from environment variables with fallbacks
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@badminton.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const adminExists = await User.findOne({ where: { username: adminUsername } });
    if (!adminExists) {
      await User.create({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log(`Default admin user created: ${adminUsername}/${adminPassword}`);
      console.log(`Admin email: ${adminEmail}`);
    } else {
      console.log(`Admin user '${adminUsername}' already exists`);
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Import sample data from Excel
async function importSamplePlayers() {
  // Try different possible filenames
  const possibleFilenames = [
    'MBPL Season 1.0.xlsx',
    'MBPLSeason1.0.xlsx',
    'MBPL Season 1.0.xls',
    'MBPLSeason1.0.xls'
  ];
  
  let excelPath = null;
  for (const filename of possibleFilenames) {
    const path = require('path').join(__dirname, filename);
    if (fs.existsSync(path)) {
      excelPath = path;
      console.log(`✅ Found Excel file: ${filename}`);
      break;
    }
  }
  
  if (!excelPath) {
    console.log('❌ No Excel file found. Expected one of:', possibleFilenames);
    console.log('📁 Current directory files:', fs.readdirSync(__dirname).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls')));
    return;
  }

  try {
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log(`📊 Reading sheet: ${sheetName}`);

    // Manually set the headers you want to use
    const headers = [
      'Rank', 'Latest Rating Points', 'Player Name', 'Initial Rating', 'Current Rating', 'Joining Date',
      'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
    ];

    // Read the data, skipping the first row (header)
    const rows = xlsx.utils.sheet_to_json(sheet, { header: headers, range: 1, defval: '' });
    console.log(`📈 Found ${rows.length} rows in Excel file`);

    const players = [];
    for (const row of rows) {
      const name = row['Player Name']?.toString().trim();
      const initialRating = Number(row['Initial Rating']);
      const currentRating = Number(row['Current Rating']);
      let joiningDate = row['Joining Date'];
      
      // Parse joining date in DD-MMM-YY format (e.g., 12-Jul-25)
      if (typeof joiningDate === 'string' && joiningDate.match(/^\d{1,2}-[A-Za-z]{3}-\d{2}$/)) {
        const [day, mon, year] = joiningDate.split('-');
        const monthMap = { 
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', 
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' 
        };
        joiningDate = `20${year}-${monthMap[mon]}-${day.padStart(2, '0')}`;
      } else if (joiningDate instanceof Date) {
        joiningDate = joiningDate.toISOString().slice(0, 10);
      } else if (typeof joiningDate === 'string' && joiningDate.includes('/')) {
        // Handle other date formats
        const date = new Date(joiningDate);
        if (!isNaN(date.getTime())) {
          joiningDate = date.toISOString().slice(0, 10);
        }
      }
      
      // Validate the data
      if (name && !isNaN(initialRating) && !isNaN(currentRating) && joiningDate) {
        players.push({ name, initialRating, currentRating, joiningDate });
        console.log('✅ Loaded player:', { name, initialRating, currentRating, joiningDate });
      } else {
        console.log('❌ Skipped invalid row:', { 
          name, 
          initialRating, 
          currentRating, 
          joiningDate,
          isValid: !!(name && !isNaN(initialRating) && !isNaN(currentRating) && joiningDate)
        });
      }
    }
    
    console.log(`📊 Processed ${players.length} valid players out of ${rows.length} rows`);
    
    const count = await Player.count();
    if (players.length > 0 && count === 0) {
      await Player.bulkCreate(players);
      console.log(`✅ Successfully imported ${players.length} players from Excel`);
    } else if (players.length === 0) {
      console.log('❌ No valid players found in Excel file');
    } else {
      console.log(`⏭️  Players already exist in DB (${count} found), skipping import`);
    }
    
  } catch (error) {
    console.error('❌ Error importing players from Excel:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Sync DB and start server
db.sync().then(async () => {
  console.log('🗄️  Database synchronized successfully');
  
  try {
    console.log('👤 Creating default admin user...');
    await createDefaultAdmin();
    console.log('✅ Default admin user created/verified');
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
  
  try {
    console.log('📊 Importing sample players from Excel...');
    await importSamplePlayers();
  } catch (error) {
    console.error('❌ Error importing players:', error.message);
  }
  
  const HTTP_PORT = process.env.HTTP_PORT || 8084;
  const HTTPS_PORT = process.env.HTTPS_PORT || 8085;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  // Start HTTP server
  const httpServer = http.createServer(app);
  httpServer.listen(HTTP_PORT, () => {
    console.log(`🚀 HTTP Server running on port ${HTTP_PORT}`);
    console.log(`📱 Environment: ${NODE_ENV}`);
    console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });
  
  // Start HTTPS server if SSL certificates are available
  const sslKeyPath = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/your-domain.com/privkey.pem';
  const sslCertPath = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/your-domain.com/fullchain.pem';
  
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };
      
      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`🌍 Production URL: https://your-production-domain.com`);
      });
    } catch (error) {
      console.error('❌ Error starting HTTPS server:', error.message);
      console.log('⚠️  HTTPS server not started. Running HTTP only.');
    }
  } else {
    console.log('⚠️  SSL certificates not found. Running HTTP only.');
    console.log(`📁 Expected SSL key path: ${sslKeyPath}`);
    console.log(`📁 Expected SSL cert path: ${sslCertPath}`);
  }
}).catch(error => {
  console.error('❌ Database synchronization failed:', error.message);
  process.exit(1);
});