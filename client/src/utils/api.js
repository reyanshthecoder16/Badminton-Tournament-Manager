// API utility functions with authentication

const API_BASE_URL = '/api';

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
  createResult: (resultData) => apiRequest('/results', {
    method: 'POST',
    body: JSON.stringify(resultData),
  }),
  updateResult: (id, resultData) => apiRequest(`/results/${id}`, {
    method: 'PUT',
    body: JSON.stringify(resultData),
  }),

  // Auth
  getProfile: () => apiRequest('/auth/profile'),
  changePassword: (passwordData) => apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),
  logout: () => apiRequest('/auth/logout', {
    method: 'POST',
  }),
};

export {
  getToken,
  getUser,
  isAuthenticated,
  isAdmin,
  logout,
  apiRequest,
}; 