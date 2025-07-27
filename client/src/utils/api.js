// API utility functions with authentication

// Configure API base URL based on environment
const getApiBaseUrl = () => {
  // Check if we're in production (built React app)
  if (process.env.NODE_ENV === 'production') {
    // Use the configured backend URL for production
    return 'https://mpf.ankesh.fun:8085/api';
  }
  
  // For development, check if there's a custom API URL set
  const customApiUrl = process.env.REACT_APP_API_URL;
  if (customApiUrl) {
    return `${customApiUrl}/api`;
  }
  
  // Default to relative path for development
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Get stored token
const getToken = () => {
  return localStorage.getItem('token');
};

// Get stored user
const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

// Check if user is admin
const isAdmin = () => {
  const user = getUser();
  return user && user.role === 'admin';
};

// Logout function
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
};

// Make non-authenticated API request (for login, public endpoints)
const publicApiRequest = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

// Make authenticated API request
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
    
    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to perform this action.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

// API methods for different endpoints
export const api = {
  // Players
  getPlayers: () => apiRequest('/players'),
  getPlayerPerformance: () => apiRequest('/players/performance'),
  createPlayer: (playerData) => apiRequest('/players', {
    method: 'POST',
    body: JSON.stringify(playerData),
  }),
  updatePlayer: (id, playerData) => apiRequest(`/players/${id}`, {
    method: 'PUT',
    body: JSON.stringify(playerData),
  }),
  deletePlayer: (id) => apiRequest(`/players/${id}`, {
    method: 'DELETE',
  }),

  // Attendance
  getAttendance: () => apiRequest('/attendance'),
  saveAttendance: (attendanceData) => apiRequest('/attendance', {
    method: 'PUT',
    body: JSON.stringify(attendanceData),
  }),
  createAttendance: (attendanceData) => apiRequest('/attendance', {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  }),
  updateAttendance: (id, attendanceData) => apiRequest(`/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(attendanceData),
  }),

  // Schedule
  getSchedule: () => apiRequest('/schedule'),
  getMatchDays: () => apiRequest('/schedule/matchdays'),
  getScheduleByMatchDay: (matchDayId) => apiRequest(`/schedule/${matchDayId}`),
  createSchedule: (scheduleData) => apiRequest('/schedule', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  }),
  updateSchedule: (id, scheduleData) => apiRequest(`/schedule/${id}`, {
    method: 'PUT',
    body: JSON.stringify(scheduleData),
  }),

  // Results
  getResults: () => apiRequest('/results'),
  getMatches: () => apiRequest('/results/matches'),
  finalizeMatches: (matchDayData) => apiRequest('/results/finalizeMatches', {
    method: 'POST',
    body: JSON.stringify(matchDayData),
  }),
  createResult: (resultData) => apiRequest('/results', {
    method: 'POST',
    body: JSON.stringify(resultData),
  }),
  updateResult: (id, resultData) => apiRequest(`/results/${id}`, {
    method: 'PUT',
    body: JSON.stringify(resultData),
  }),

  // Auth
  login: (credentials) => publicApiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getProfile: () => apiRequest('/auth/profile'),
  changePassword: (passwordData) => apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),
  logout: () => apiRequest('/auth/logout', {
    method: 'POST',
  }),

  // Public endpoints
  getPublicPerformance: () => publicApiRequest('/public/players/performance'),
  getPublicMatchDetails: (matchId) => publicApiRequest(`/public/matches/${matchId}`),
  getPublicMatchDays: () => publicApiRequest('/public/schedule/matchdays'),
  getTopPlayersByRatingChange: (matchDay) => publicApiRequest(`/public/players/top-by-rating-change?matchDay=${matchDay}`),
};

export {
  getToken,
  getUser,
  isAuthenticated,
  isAdmin,
  logout,
  apiRequest,
  publicApiRequest,
}; 