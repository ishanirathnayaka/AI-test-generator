import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth service
const authService = {
  /**
   * Login user
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise} API response
   */
  login: async (email, password) => {
    const response = await api.post('/login', {
      email: email.toLowerCase().trim(),
      password,
    });
    return response;
  },

  /**
   * Register new user
   * @param {string} name 
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise} API response
   */
  register: async (name, email, password) => {
    const response = await api.post('/register', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });
    return response;
  },

  /**
   * Validate token
   * @param {string} token 
   * @returns {Promise} API response
   */
  validateToken: async (token) => {
    const response = await api.get('/validate', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken 
   * @returns {Promise} API response
   */
  refreshToken: async (refreshToken) => {
    const response = await api.post('/refresh', {
      refreshToken,
    });
    return response;
  },

  /**
   * Logout user
   * @param {string} token 
   * @returns {Promise} API response
   */
  logout: async (token) => {
    const response = await api.post('/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  },

  /**
   * Get user profile
   * @param {string} token 
   * @returns {Promise} API response
   */
  getProfile: async (token) => {
    const response = await api.get('/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  },

  /**
   * Request password reset
   * @param {string} email 
   * @returns {Promise} API response
   */
  requestPasswordReset: async (email) => {
    const response = await api.post('/forgot-password', {
      email: email.toLowerCase().trim(),
    });
    return response;
  },

  /**
   * Reset password
   * @param {string} token 
   * @param {string} newPassword 
   * @returns {Promise} API response
   */
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/reset-password', {
      token,
      password: newPassword,
    });
    return response;
  },

  /**
   * Change password
   * @param {string} currentPassword 
   * @param {string} newPassword 
   * @returns {Promise} API response
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  },

  /**
   * Update user profile
   * @param {Object} profileData 
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/profile', profileData);
    return response;
  },

  /**
   * Delete user account
   * @param {string} password 
   * @returns {Promise} API response
   */
  deleteAccount: async (password) => {
    const response = await api.delete('/account', {
      data: { password },
    });
    return response;
  },
};

export default authService;