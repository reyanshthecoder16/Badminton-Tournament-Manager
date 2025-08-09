// API utility functions with authentication

// Configure API base URL based on environment variables
const getApiBaseUrl = () => {
  // Get base URL and endpoint from environment variables
  const baseUrl = process.env.REACT_APP_API_BASE_URL;
  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT || '/api';
  
  if (!baseUrl) {
    console.warn('REACT_APP_API_BASE_URL not set, using fallback');
    // Fallback URLs from environment variables
    if (process.env.NODE_ENV === 'production') {
      const fallbackUrl = process.env.REACT_APP_FALLBACK_PROD_URL || 'https://your-production-domain.com:8085';
      const fallbackEndpoint = process.env.REACT_APP_FALLBACK_PROD_ENDPOINT || '/api';
      return `${fallbackUrl}${fallbackEndpoint}`;
    }
    const fallbackUrl = process.env.REACT_APP_FALLBACK_DEV_URL || 'http://localhost:8085';
    const fallbackEndpoint = process.env.REACT_APP_FALLBACK_DEV_ENDPOINT || '/api';
    return `${fallbackUrl}${fallbackEndpoint}`;
  }
  
  // Combine base URL with configurable endpoint
  return `${baseUrl}${apiEndpoint}`;
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
  console.log('Environment:', process.env.REACT_APP_ENVIRONMENT || 'development');
  console.log('API Endpoint:', process.env.REACT_APP_API_ENDPOINT || '/api');
  console.log('Fallback Dev URL:', process.env.REACT_APP_FALLBACK_DEV_URL || 'http://localhost:8085');
  console.log('Fallback Prod URL:', process.env.REACT_APP_FALLBACK_PROD_URL || 'https://your-production-domain.com:8085');
}

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
  // Create a new match (backend)
  createMatch: async (matchData) => {
    return await publicApiRequest('/public/matches', {
      method: 'POST',
      body: JSON.stringify(matchData)
    });
  },
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
  getAttendanceByDate: (date) => apiRequest(`/attendance/${date}`),
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
  checkScheduleExists: (date) => apiRequest(`/schedule/check/${date}`),
  updateSchedule: (id, scheduleData) => apiRequest(`/schedule/${id}`, {
    method: 'PUT',
    body: JSON.stringify(scheduleData),
  }),

  // Results
  getResults: () => apiRequest('/results'),
  getMatches: () => apiRequest('/results/matches'),
  getFinalizePreview: (matchDayId) => apiRequest(`/results/preview/${matchDayId}`),
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
  deleteMatch: (id) => apiRequest(`/results/${id}`, {
    method: 'DELETE',
  }),
  createMatch: (matchData) => apiRequest('/results/match', {
    method: 'POST',
    body: JSON.stringify(matchData),
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
  logout: async () => {
    return await apiRequest('/auth/logout', { method: 'POST' });
  },

  // Player management
  createPlayer: async (playerData) => {
    return await apiRequest('/players', {
      method: 'POST',
      body: JSON.stringify(playerData)
    });
  },

  updatePlayer: async (playerId, playerData) => {
    return await apiRequest(`/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    });
  },

  deletePlayer: async (playerId) => {
    return await apiRequest(`/players/${playerId}`, {
      method: 'DELETE'
    });
  },

  checkPlayerMatches: async (playerId) => {
    return await apiRequest(`/players/${playerId}/matches`);
  },

  // Public endpoints
  getPublicPerformance: () => publicApiRequest('/public/players/performance'),
  getPublicSnapshots: () => publicApiRequest('/public/players/snapshots'),
  getPublicMatchDetails: (matchId) => publicApiRequest(`/public/matches/${matchId}`),
  getPublicMatchDays: () => publicApiRequest('/public/schedule/matchdays'),
  getTopPlayersByRatingChange: (matchDay) => publicApiRequest(`/public/players/top-by-rating-change?matchDay=${matchDay}`),
  getPublicHighlights: (matchDay, limit = 10) => publicApiRequest(`/public/highlights?matchDay=${encodeURIComponent(matchDay)}&limit=${limit}`),
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