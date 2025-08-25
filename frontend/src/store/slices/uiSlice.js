import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  // App initialization
  isInitialized: false,
  
  // Theme and layout
  theme: 'light', // 'light' | 'dark'
  sidebarOpen: true,
  activeTab: 'editor',
  
  // Loading states
  isLoading: false,
  loadingMessage: '',
  
  // Modals and dialogs
  modals: {
    confirmDialog: {
      open: false,
      title: '',
      message: '',
      onConfirm: null,
      onCancel: null,
    },
    settingsDialog: {
      open: false,
    },
    aboutDialog: {
      open: false,
    },
  },
  
  // Notifications
  notifications: [],
  
  // User preferences
  preferences: {
    defaultLanguage: 'javascript',
    defaultFramework: 'jest',
    autoSave: true,
    showWelcomeMessage: true,
    codeEditorSettings: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: true,
      lineNumbers: true,
      autoComplete: true,
    },
    aiSettings: {
      preferredModel: 'microsoft/CodeBERT-base',
      maxTokens: 2048,
      temperature: 0.7,
      includeComments: true,
    },
  },
  
  // Error handling
  globalError: null,
  
  // Performance monitoring
  performance: {
    lastApiCall: null,
    apiCallCount: 0,
    averageResponseTime: 0,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // App initialization
    initializeApp: (state) => {
      state.isInitialized = true;
    },
    
    // Theme and layout
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    
    // Loading states
    setLoading: (state, action) => {
      const { isLoading, message = '' } = action.payload;
      state.isLoading = isLoading;
      state.loadingMessage = message;
    },
    
    // Modals and dialogs
    openConfirmDialog: (state, action) => {
      const { title, message, onConfirm, onCancel } = action.payload;
      state.modals.confirmDialog = {
        open: true,
        title,
        message,
        onConfirm,
        onCancel,
      };
    },
    
    closeConfirmDialog: (state) => {
      state.modals.confirmDialog = {
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
      };
    },
    
    openSettingsDialog: (state) => {
      state.modals.settingsDialog.open = true;
    },
    
    closeSettingsDialog: (state) => {
      state.modals.settingsDialog.open = false;
    },
    
    openAboutDialog: (state) => {
      state.modals.aboutDialog.open = true;
    },
    
    closeAboutDialog: (state) => {
      state.modals.aboutDialog.open = false;
    },
    
    // Notifications
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.notifications.push(notification);
      
      // Limit notifications to 10
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(-10);
      }
    },
    
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // User preferences
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    
    updateCodeEditorSettings: (state, action) => {
      state.preferences.codeEditorSettings = {
        ...state.preferences.codeEditorSettings,
        ...action.payload,
      };
    },
    
    updateAISettings: (state, action) => {
      state.preferences.aiSettings = {
        ...state.preferences.aiSettings,
        ...action.payload,
      };
    },
    
    // Error handling
    setGlobalError: (state, action) => {
      state.globalError = action.payload;
    },
    
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    
    // Performance monitoring
    recordApiCall: (state, action) => {
      const { responseTime } = action.payload;
      state.performance.lastApiCall = new Date().toISOString();
      state.performance.apiCallCount += 1;
      
      // Calculate moving average response time
      const currentAverage = state.performance.averageResponseTime;
      const count = state.performance.apiCallCount;
      state.performance.averageResponseTime = 
        (currentAverage * (count - 1) + responseTime) / count;
    },
    
    // Reset state
    resetUI: (state) => {
      // Reset to initial state but preserve some user preferences
      const preservedPreferences = state.preferences;
      const preservedTheme = state.theme;
      
      Object.assign(state, initialState);
      
      state.preferences = preservedPreferences;
      state.theme = preservedTheme;
      state.isInitialized = true;
    },
  },
});

// Export actions
export const {
  initializeApp,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setActiveTab,
  setLoading,
  openConfirmDialog,
  closeConfirmDialog,
  openSettingsDialog,
  closeSettingsDialog,
  openAboutDialog,
  closeAboutDialog,
  addNotification,
  removeNotification,
  clearNotifications,
  updatePreferences,
  updateCodeEditorSettings,
  updateAISettings,
  setGlobalError,
  clearGlobalError,
  recordApiCall,
  resetUI,
} = uiSlice.actions;

// Selectors
export const selectUI = (state) => state.ui;
export const selectTheme = (state) => state.ui.theme;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectIsLoading = (state) => state.ui.isLoading;
export const selectLoadingMessage = (state) => state.ui.loadingMessage;
export const selectModals = (state) => state.ui.modals;
export const selectNotifications = (state) => state.ui.notifications;
export const selectPreferences = (state) => state.ui.preferences;
export const selectCodeEditorSettings = (state) => state.ui.preferences.codeEditorSettings;
export const selectAISettings = (state) => state.ui.preferences.aiSettings;
export const selectGlobalError = (state) => state.ui.globalError;
export const selectPerformance = (state) => state.ui.performance;
export const selectIsInitialized = (state) => state.ui.isInitialized;

export default uiSlice.reducer;