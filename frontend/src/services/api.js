import axios from 'axios';
import store from '../store';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          store.dispatch({ type: 'auth/logout' });
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?expired=true';
          }
          break;
        
        case 403:
          // Forbidden - insufficient permissions
          console.warn('Access denied:', data.message);
          break;
        
        case 404:
          // Not found
          console.warn('Resource not found:', error.config.url);
          break;
        
        case 422:
          // Validation error
          console.warn('Validation error:', data.errors);
          break;
        
        case 429:
          // Rate limit exceeded
          console.warn('Rate limit exceeded, please try again later');
          break;
        
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error:', data.message);
          break;
        
        default:
          console.error('API Error:', data.message || 'Unknown error');
      }
      
      // Enhance error with additional info
      error.message = data.message || error.message;
      error.code = data.code || status;
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      error.message = 'Network error. Please check your connection.';
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoint collections
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/me',
    updateProfile: '/auth/profile',
    changePassword: '/auth/password',
  },
  
  // Code Analysis
  code: {
    analyze: '/code/analyze',
    getAnalysis: (id) => `/code/analysis/${id}`,
    getUserAnalyses: '/code/analysis',
    deleteAnalysis: (id) => `/code/analysis/${id}`,
    getAnalytics: '/code/analytics',
  },
  
  // Test Generation
  tests: {
    generate: '/code/generate-tests',
    getGeneration: (id) => `/code/tests/${id}`,
    getUserGenerations: '/code/tests',
    deleteGeneration: (id) => `/code/tests/${id}`,
    export: (id) => `/code/tests/${id}/export`,
  },
  
  // Coverage Analysis
  coverage: {
    analyze: '/code/analyze-coverage',
    getReport: (id) => `/code/coverage/${id}`,
    getUserReports: '/code/coverage',
    deleteReport: (id) => `/code/coverage/${id}`,
  },
  
  // System
  system: {
    supported: '/code/supported',
    health: '/health',
    status: '/status',
  },
};

// Utility functions for common operations
export const apiUtils = {
  // Upload file with progress
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(progress);
      },
    });
  },
  
  // Download file
  downloadFile: async (url, filename) => {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
  },
  
  // Retry request
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  },
  
  // Batch requests
  batchRequests: async (requests, options = {}) => {
    const { concurrency = 3, delay = 100 } = options;
    const results = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(request => request())
      );
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + concurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  },
};

export default api;