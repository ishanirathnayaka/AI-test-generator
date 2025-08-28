import { api } from './api';

/**
 * User Service
 * Handles all user-related API calls
 */
class UserService {
  /**
   * Get user profile
   * @returns {Promise} API response
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/me');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} API response
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', {
        name: profileData.name,
        email: profileData.email,
        preferences: profileData.preferences,
        settings: profileData.settings
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} API response
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user preferences
   * @param {Object} preferences - User preferences
   * @returns {Promise} API response
   */
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/auth/profile', { preferences });
      return {
        success: true,
        data: response.data.data.preferences,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user analytics
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getAnalytics(params = {}) {
    try {
      const queryParams = {
        period: params.period || 'month',
        includeDetails: params.includeDetails || true,
        groupBy: params.groupBy || 'date'
      };

      const response = await api.get('/code/analytics', { params: queryParams });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user usage statistics
   * @returns {Promise} API response
   */
  async getUsageStats() {
    try {
      const response = await api.get('/auth/usage');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update notification settings
   * @param {Object} notificationSettings - Notification preferences
   * @returns {Promise} API response
   */
  async updateNotificationSettings(notificationSettings) {
    try {
      const response = await api.put('/auth/notifications', notificationSettings);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user notifications
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getNotifications(params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 20,
        unreadOnly: params.unreadOnly || false,
        type: params.type
      };

      const response = await api.get('/auth/notifications', { params: queryParams });
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise} API response
   */
  async markNotificationAsRead(notificationId) {
    try {
      const response = await api.put(`/auth/notifications/${notificationId}/read`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise} API response
   */
  async markAllNotificationsAsRead() {
    try {
      const response = await api.put('/auth/notifications/read-all');
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise} API response
   */
  async deleteNotification(notificationId) {
    try {
      await api.delete(`/auth/notifications/${notificationId}`);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get subscription information
   * @returns {Promise} API response
   */
  async getSubscription() {
    try {
      const response = await api.get('/auth/subscription');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload profile avatar
   * @param {File} avatarFile - Avatar image file
   * @returns {Promise} API response
   */
  async uploadAvatar(avatarFile) {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete user account
   * @param {string} password - User password for confirmation
   * @returns {Promise} API response
   */
  async deleteAccount(password) {
    try {
      const response = await api.delete('/auth/account', {
        data: { password }
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export user data
   * @param {Object} exportOptions - Export options
   * @returns {Promise} Blob for download
   */
  async exportUserData(exportOptions = {}) {
    try {
      const response = await api.get('/auth/export', {
        params: {
          format: exportOptions.format || 'json',
          includeAnalyses: exportOptions.includeAnalyses || true,
          includeGenerations: exportOptions.includeGenerations || true,
          includeCoverage: exportOptions.includeCoverage || true
        },
        responseType: 'blob'
      });

      return {
        success: true,
        data: response.data,
        filename: `user-data-export.${exportOptions.format || 'json'}`
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error
   * @returns {Object} Formatted error
   */
  handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
        validationErrors: error.response.data?.errors
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }
}

export default new UserService();