import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

// Create listener middleware
export const listenerMiddleware = createListenerMiddleware();

// Authentication listeners
listenerMiddleware.startListening({
  matcher: isAnyOf('auth/loginUser/fulfilled', 'auth/registerUser/fulfilled'),
  effect: (action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch({ type: 'user/getUserProfile' });
  },
});

// Logout cleanup
listenerMiddleware.startListening({
  matcher: isAnyOf('auth/logoutUser/fulfilled'),
  effect: (action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch({ type: 'user/resetUserState' });
    dispatch({ type: 'code/resetCodeState' });
    dispatch({ type: 'testGeneration/resetGenerationState' });
    dispatch({ type: 'coverage/resetCoverageState' });
  },
});

// Usage tracking
listenerMiddleware.startListening({
  matcher: isAnyOf(
    'code/analyzeCode/fulfilled',
    'testGeneration/generateTests/fulfilled',
    'coverage/analyzeCoverage/fulfilled'
  ),
  effect: (action, listenerApi) => {
    const { dispatch } = listenerApi;
    
    let usageType;
    if (action.type.includes('analyzeCode')) usageType = 'analyses';
    else if (action.type.includes('generateTests')) usageType = 'testGenerations';
    else if (action.type.includes('analyzeCoverage')) usageType = 'coverageReports';
    
    if (usageType) {
      dispatch({ type: 'user/incrementUsage', payload: { type: usageType } });
    }
  },
});

export default listenerMiddleware;