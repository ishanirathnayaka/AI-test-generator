import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slice reducers
import authReducer from './slices/authSlice';
import codeReducer from './slices/codeSlice';
import testGenerationReducer from './slices/testGenerationSlice';
import coverageReducer from './slices/coverageSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';

// Import middleware
import { listenerMiddleware } from './middleware/listenerMiddleware';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
  blacklist: ['code', 'testGeneration', 'coverage'], // Don't persist these for security/performance
};

// Auth persist configuration (separate for sensitive data)
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'refreshToken', 'user', 'isAuthenticated'],
  blacklist: ['isLoading', 'error'],
};

// UI persist configuration
const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme', 'sidebarOpen', 'language', 'preferences'],
  blacklist: ['isLoading', 'notifications'],
};

// Root reducer
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  code: codeReducer,
  testGeneration: testGenerationReducer,
  coverage: coverageReducer,
  ui: persistReducer(uiPersistConfig, uiReducer),
  user: userReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configure middleware
      serializableCheck: {
        // Ignore these action types for redux-persist
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['_persist'],
      },
      // Enable immutability and serialization checks in development
      immutableCheck: {
        warnAfter: 128,
      },
      serializabilityCheck: {
        warnAfter: 128,
      },
    })
    // Add listener middleware for enhanced functionality
    .prepend(listenerMiddleware.middleware),
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'AI Test Generator',
    trace: true,
    traceLimit: 25,
    actionCreators: {
      // Add custom action creators for debugging
      resetStore: () => ({ type: 'RESET_STORE' }),
    },
  },
});

// Persistor
export const persistor = persistStore(store);

// Types for TypeScript support
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Reset store (useful for logout)
export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: 'RESET_STORE' });
};

// Store enhancers for development
if (process.env.NODE_ENV === 'development') {
  // Log store state changes
  store.subscribe(() => {
    const state = store.getState();
    console.log('Store state updated:', {
      auth: {
        isAuthenticated: state.auth.isAuthenticated,
        user: state.auth.user?.email,
      },
      ui: {
        activeTab: state.ui.activeTab,
        theme: state.ui.theme,
      },
      // Don't log sensitive data
    });
  });

  // Performance monitoring
  let previousState = store.getState();
  store.subscribe(() => {
    const currentState = store.getState();
    const stateSize = JSON.stringify(currentState).length;
    
    if (stateSize > 1000000) { // 1MB threshold
      console.warn('Store state is getting large:', stateSize, 'bytes');
    }
    
    previousState = currentState;
  });
}

export default store;