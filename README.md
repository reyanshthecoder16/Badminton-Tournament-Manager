# Badminton Tournament Manager

A comprehensive web application for managing badminton tournaments with secure authentication, player management, match scheduling, and result tracking.

## Features

### 🔐 Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **Role-based Access Control**: Admin and user roles
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP header protection
- **Protected Routes**: All API endpoints require authentication

### 🏸 Tournament Management
- **Player Management**: Add, edit, and track player information
- **Match Scheduling**: Automated match generation and scheduling
- **Attendance Tracking**: Monitor player attendance
- **Result Recording**: Track match outcomes and scores
- **Performance Analytics**: Player performance statistics
- **Schedule Export**: Export schedules to PDF format
- **Public Performance View**: Players can view rankings and performance without login
- **Match Details**: Click on match codes to view detailed match information
- **Smart Pagination**: Optimized loading with responsive pagination for mobile and desktop
- **Admin Dashboard**: Secure admin interface for tournament management

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Login Screen**: Beautiful gradient design
- **Intuitive Navigation**: Clean and organized interface
- **Real-time Updates**: Live data synchronization
- **Loading States**: Smooth user experience

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database with Sequelize ORM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Helmet** for security headers
- **CORS** for cross-origin requests
- **Rate Limiting** for API protection

### Frontend
- **React.js** with modern hooks
- **CSS3** with modern styling
- **Local Storage** for token management
- **Fetch API** for HTTP requests

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Badminton-Tournament-Manager
```

### 2. Install Dependencies
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=badminton_tournament

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### 4. Database Setup
1. Create a MySQL database named `badminton_tournament`
2. The application will automatically create tables on first run

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🚀 Production Deployment

For production deployment on Digital Ocean with HTTPS support, see the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

### Quick Deployment Steps:
1. **Server Setup**: Install Node.js, MySQL, Nginx, and SSL certificates
2. **Application Setup**: Clone repository, install dependencies, build frontend
3. **Configuration**: Set up environment variables and database
4. **Reverse Proxy**: Configure Nginx to serve the application
5. **Process Management**: Use PM2 for application management

### Production URLs:
- **Main Application**: https://mpf.ankesh.fun
- **API Documentation**: https://mpf.ankesh.fun/api-docs
- **Admin Dashboard**: https://mpf.ankesh.fun/admin

### 5. Start the Application
```bash
# Start the server
npm start
```

The application will be available at `http://localhost:3000`

## Access Points

### Public Access (No Login Required)
- **Main Site**: `http://localhost:3000` - Public landing page with performance view
- **Performance View**: View all player rankings, stats, and match history
- **Current Schedule**: View today's matches

### Admin Access (Login Required)
- **Admin Dashboard**: `http://localhost:3000/admin` - Full tournament management
- **Login Required**: Username and password authentication

## Default Credentials

The system creates a default admin user on first run:

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Important**: Change the default password after first login!

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

### Public Endpoints (No Authentication Required)
- `GET /api/public/players/performance` - Get all players performance data
- `GET /api/public/players` - Get basic player list
- `GET /api/public/schedule/current` - Get current day schedule
- `GET /api/public/matches/{matchId}` - Get detailed match information with team details

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/users` - Get all users (admin only)

### Protected Endpoints (Admin Only)
All other endpoints require authentication via Bearer token:

- `GET /api/players` - Get all players
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record

- `GET /api/schedule` - Get match schedule
- `POST /api/schedule` - Create match schedule
- `PUT /api/schedule/:id` - Update match schedule

- `GET /api/results` - Get match results
- `POST /api/results` - Create match result
- `PUT /api/results/:id` - Update match result

## Security Features

### Authentication Flow
1. User submits login credentials
2. Server validates credentials and returns JWT token
3. Client stores token in localStorage
4. All subsequent requests include token in Authorization header
5. Server validates token on each request

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Password validation and strength requirements
- Secure password change functionality

### API Security
- Rate limiting on all endpoints
- Stricter rate limiting on authentication endpoints
- CORS protection with configurable origins
- Helmet security headers
- Input validation and sanitization

### Session Management
- JWT tokens with 24-hour expiration
- Automatic logout on token expiration
- Secure token storage in localStorage

## User Roles

### Admin
- Full access to all features
- Can create and manage users
- Can modify all tournament data
- Access to administrative functions

### User
- View tournament data
- Update match results
- Limited administrative access
- Cannot manage other users

## File Structure

```
Badminton-Tournament-Manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS files
├── config/                 # Database configuration
├── middleware/             # Authentication middleware
├── models/                 # Database models
├── routes/                 # API routes
├── services/               # Business logic
└── migrations/             # Database migrations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 