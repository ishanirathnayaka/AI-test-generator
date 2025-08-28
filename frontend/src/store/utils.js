import { createSelector } from '@reduxjs/toolkit';

// Memoized selectors for better performance
export const selectAuthState = (state) => state.auth;
export const selectUserState = (state) => state.user;
export const selectCodeState = (state) => state.code;
export const selectTestGenerationState = (state) => state.testGeneration;
export const selectCoverageState = (state) => state.coverage;
export const selectUIState = (state) => state.ui;

// Complex selectors using createSelector for memoization
export const selectUserWithAuth = createSelector(
  [selectAuthState, selectUserState],
  (auth, user) => ({
    ...user,
    isAuthenticated: auth.isAuthenticated,
    authUser: auth.user
  })
);

export const selectDashboardData = createSelector(
  [selectUserState, selectCodeState, selectTestGenerationState, selectCoverageState],
  (user, code, testGeneration, coverage) => ({
    usage: user.usage,
    recentAnalyses: code.analyses.slice(0, 5),
    recentGenerations: testGeneration.generations.slice(0, 5),
    recentReports: coverage.reports.slice(0, 5),
    totalItems: {
      analyses: code.analyses.length,
      generations: testGeneration.generations.length,
      reports: coverage.reports.length
    }
  })
);

export const selectActiveOperations = createSelector(
  [selectCodeState, selectTestGenerationState, selectCoverageState],
  (code, testGeneration, coverage) => ({
    isAnalyzing: code.isAnalyzing,
    isGenerating: testGeneration.isGenerating,
    isCoverageAnalyzing: coverage.isAnalyzing,
    anyActive: code.isAnalyzing || testGeneration.isGenerating || coverage.isAnalyzing
  })
);

export const selectUserPreferencesWithDefaults = createSelector(
  [selectUserState],
  (user) => ({
    defaultFramework: user.preferences?.defaultFramework || 'jest',
    defaultLanguage: user.preferences?.defaultLanguage || 'javascript',
    aiModel: user.preferences?.aiModel || 'CodeT5',
    autoSave: user.preferences?.autoSave ?? true,
    showTips: user.preferences?.showTips ?? true,
    editorTheme: user.preferences?.editorTheme || 'vs-dark',
    fontSize: user.preferences?.fontSize || 14,
    tabSize: user.preferences?.tabSize || 2
  })
);

// Action creators for complex operations
export const createBatchActions = (actions) => ({
  type: 'BATCH_ACTIONS',
  payload: actions
});

export const createOptimisticUpdate = (action, rollbackAction) => ({
  type: 'OPTIMISTIC_UPDATE',
  payload: { action, rollbackAction }
});

// State validation utilities
export const validateState = (state) => {
  const errors = [];
  
  // Validate auth state
  if (state.auth.isAuthenticated && !state.auth.user) {
    errors.push('Invalid auth state: authenticated but no user');
  }
  
  // Validate user state
  if (state.user.profile && !state.user.profile.id) {
    errors.push('Invalid user profile: missing id');
  }
  
  // Validate arrays
  if (!Array.isArray(state.code.analyses)) {
    errors.push('Code analyses should be an array');
  }
  
  if (!Array.isArray(state.testGeneration.generatedTests)) {
    errors.push('Generated tests should be an array');
  }
  
  return errors;
};

// State migration utilities (for future updates)
export const migrateState = (persistedState, version) => {
  switch (version) {
    case 1:
      // Migration logic for version 1
      return {
        ...persistedState,
        version: 1
      };
    default:
      return persistedState;
  }
};

// Performance monitoring utilities
export const measureActionTime = (actionType, startTime) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration > 100) { // Log slow actions (>100ms)
    console.warn(`Slow action detected: ${actionType} took ${duration.toFixed(2)}ms`);
  }
  
  return duration;
};

// State snapshot utilities
export const createStateSnapshot = (state) => ({
  timestamp: Date.now(),
  auth: {
    isAuthenticated: state.auth.isAuthenticated,
    userId: state.auth.user?.id
  },
  counts: {
    analyses: state.code.analyses.length,
    tests: state.testGeneration.generatedTests.length,
    reports: state.coverage.reports.length,
    notifications: state.user.notifications.length
  },
  sizes: {
    state: JSON.stringify(state).length,
    analyses: JSON.stringify(state.code.analyses).length,
    tests: JSON.stringify(state.testGeneration.generatedTests).length
  }
});

// Error boundary utilities
export const createErrorAction = (error, context) => ({
  type: 'GLOBAL_ERROR',
  payload: {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  }
});

export default {
  selectUserWithAuth,
  selectDashboardData,
  selectActiveOperations,
  selectUserPreferencesWithDefaults,
  createBatchActions,
  createOptimisticUpdate,
  validateState,
  migrateState,
  measureActionTime,
  createStateSnapshot,
  createErrorAction
};