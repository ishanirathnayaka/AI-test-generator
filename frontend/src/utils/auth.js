/**
 * JWT token utilities
 */

/**
 * Decode JWT token (without verification)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload
 */
export const decodeToken = (token) => {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} Whether token is expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  
  return new Date(decoded.exp * 1000);
};

/**
 * Get time until token expires
 * @param {string} token - JWT token
 * @returns {number} Milliseconds until expiration
 */
export const getTimeUntilExpiration = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;
  
  return Math.max(0, expiration.getTime() - Date.now());
};

/**
 * Check if token will expire soon
 * @param {string} token - JWT token
 * @param {number} threshold - Threshold in milliseconds (default: 5 minutes)
 * @returns {boolean} Whether token will expire soon
 */
export const willTokenExpireSoon = (token, threshold = 5 * 60 * 1000) => {
  const timeUntilExpiration = getTimeUntilExpiration(token);
  return timeUntilExpiration > 0 && timeUntilExpiration <= threshold;
};

/**
 * Get user ID from token
 * @param {string} token - JWT token
 * @returns {string|null} User ID
 */
export const getUserIdFromToken = (token) => {
  const decoded = decodeToken(token);
  return decoded?.userId || decoded?.sub || null;
};

/**
 * Get user email from token
 * @param {string} token - JWT token
 * @returns {string|null} User email
 */
export const getUserEmailFromToken = (token) => {
  const decoded = decodeToken(token);
  return decoded?.email || null;
};

/**
 * Get user role from token
 * @param {string} token - JWT token
 * @returns {string|null} User role
 */
export const getUserRoleFromToken = (token) => {
  const decoded = decodeToken(token);
  return decoded?.role || 'user';
};

/**
 * Clear all auth tokens from localStorage
 */
export const clearAuthTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  // Clear any other auth-related items
  localStorage.removeItem('user');
  localStorage.removeItem('authExpiration');
};

/**
 * Store auth tokens in localStorage
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export const storeAuthTokens = (accessToken, refreshToken) => {
  localStorage.setItem('token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  // Store expiration time for quick checks
  const expiration = getTokenExpiration(accessToken);
  if (expiration) {
    localStorage.setItem('authExpiration', expiration.toISOString());
  }
};

/**
 * Get stored auth tokens
 * @returns {Object} Auth tokens
 */
export const getStoredAuthTokens = () => {
  return {
    accessToken: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    expiration: localStorage.getItem('authExpiration'),
  };
};

/**
 * Validate token format (basic check)
 * @param {string} token - JWT token
 * @returns {boolean} Whether token format is valid
 */
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
export const formatRole = (role) => {
  if (!role) return 'User';
  
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

/**
 * Check if user has required role
 * @param {string} userRole - User's role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} Whether user has required role
 */
export const hasRole = (userRole, requiredRoles) => {
  if (!userRole) return false;
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(userRole);
};

/**
 * Generate a random state for OAuth flows
 * @returns {string} Random state string
 */
export const generateOAuthState = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Create Authorization header
 * @param {string} token - JWT token
 * @returns {string} Authorization header value
 */
export const createAuthHeader = (token) => {
  return token ? `Bearer ${token}` : '';
};

/**
 * Handle authentication errors
 * @param {Error} error - Authentication error
 * @returns {Object} Formatted error
 */
export const handleAuthError = (error) => {
  const defaultError = {
    message: 'Authentication failed',
    code: 'AUTH_ERROR',
    status: 500,
  };
  
  if (!error.response) {
    return {
      ...defaultError,
      message: 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
  
  const { data, status } = error.response;
  
  return {
    message: data?.error || data?.message || defaultError.message,
    code: data?.code || 'AUTH_ERROR',
    status: status || 500,
    details: data?.details || null,
  };
};

export default {
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTimeUntilExpiration,
  willTokenExpireSoon,
  getUserIdFromToken,
  getUserEmailFromToken,
  getUserRoleFromToken,
  clearAuthTokens,
  storeAuthTokens,
  getStoredAuthTokens,
  isValidTokenFormat,
  formatRole,
  hasRole,
  generateOAuthState,
  createAuthHeader,
  handleAuthError,
};