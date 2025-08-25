import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/code`,
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

// Code service
const codeService = {
  /**
   * Analyze code structure and extract functions/classes
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @param {string} analysisType - Type of analysis (functions, classes, modules)
   * @returns {Promise} API response
   */
  analyzeCode: async (code, language, analysisType = 'functions') => {
    const response = await api.post('/analyze', {
      code,
      language,
      analysisType,
    });
    return response;
  },

  /**
   * Upload code file for analysis
   * @param {File} file - Code file to upload
   * @returns {Promise} API response
   */
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', getLanguageFromExtension(file.name));

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Track upload progress
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percentCompleted}%`);
        
        // Dispatch progress event for UI updates
        window.dispatchEvent(new CustomEvent('uploadProgress', {
          detail: { percentCompleted, loaded: progressEvent.loaded, total: progressEvent.total }
        }));
      },
    });
    return response;
  },

  /**
   * Upload multiple code files
   * @param {FileList} files - Multiple code files
   * @returns {Promise} API response
   */
  uploadMultipleFiles: async (files) => {
    const formData = new FormData();
    
    Array.from(files).forEach((file, index) => {
      formData.append(`files`, file);
      formData.append(`languages[${index}]`, getLanguageFromExtension(file.name));
    });

    const response = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  /**
   * Get analysis history for user
   * @param {number} limit - Number of records to fetch
   * @param {number} offset - Pagination offset
   * @returns {Promise} API response
   */
  getAnalysisHistory: async (limit = 10, offset = 0) => {
    const response = await api.get('/history', {
      params: { limit, offset },
    });
    return response;
  },

  /**
   * Save code analysis result
   * @param {Object} analysisData - Analysis data to save
   * @returns {Promise} API response
   */
  saveAnalysis: async (analysisData) => {
    const response = await api.post('/save', analysisData);
    return response;
  },

  /**
   * Delete saved analysis
   * @param {string} analysisId - ID of analysis to delete
   * @returns {Promise} API response
   */
  deleteAnalysis: async (analysisId) => {
    const response = await api.delete(`/analysis/${analysisId}`);
    return response;
  },

  /**
   * Validate code syntax
   * @param {string} code - Source code to validate
   * @param {string} language - Programming language
   * @returns {Promise} API response
   */
  validateSyntax: async (code, language) => {
    const response = await api.post('/validate', {
      code,
      language,
    });
    return response;
  },

  /**
   * Get code metrics (complexity, lines, etc.)
   * @param {string} code - Source code to analyze
   * @param {string} language - Programming language
   * @returns {Promise} API response
   */
  getCodeMetrics: async (code, language) => {
    const response = await api.post('/metrics', {
      code,
      language,
    });
    return response;
  },

  /**
   * Format code using language-specific formatter
   * @param {string} code - Source code to format
   * @param {string} language - Programming language
   * @param {Object} options - Formatting options
   * @returns {Promise} API response
   */
  formatCode: async (code, language, options = {}) => {
    const response = await api.post('/format', {
      code,
      language,
      options,
    });
    return response;
  },
};

/**
 * Get programming language from file extension
 * @param {string} filename - File name with extension
 * @returns {string} Programming language
 */
const getLanguageFromExtension = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'kt': 'kotlin',
    'swift': 'swift',
  };
  
  return extensionMap[extension] || 'javascript';
};

/**
 * Check if file type is supported
 * @param {string} filename - File name with extension
 * @returns {boolean} Whether file type is supported
 */
export const isSupportedFileType = (filename) => {
  const supportedExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 
    'cpp', 'cxx', 'cc', 'c', 'cs', 'php', 
    'rb', 'go', 'rs', 'kt', 'swift'
  ];
  
  const extension = filename.split('.').pop().toLowerCase();
  return supportedExtensions.includes(extension);
};

/**
 * Get maximum file size allowed
 * @returns {number} Maximum file size in bytes
 */
export const getMaxFileSize = () => {
  return parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760; // 10MB default
};

export default codeService;