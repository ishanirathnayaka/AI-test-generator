import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';

// Typed hooks for Redux
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Auth hooks
export const useAuth = () => {
  return useAppSelector((state) => ({
    isAuthenticated: state.auth.isAuthenticated,
    user: state.auth.user,
    token: state.auth.token,
    isLoading: state.auth.isLoading,
    error: state.auth.error
  }));
};

// User hooks
export const useUser = () => {
  return useAppSelector((state) => ({
    profile: state.user.profile,
    settings: state.user.settings,
    preferences: state.user.preferences,
    usage: state.user.usage,
    analytics: state.user.analytics,
    notifications: state.user.notifications,
    isLoading: state.user.isLoading,
    error: state.user.error
  }));
};

// Code analysis hooks
export const useCodeAnalysis = () => {
  return useAppSelector((state) => ({
    currentAnalysis: state.code.currentAnalysis,
    analyses: state.code.analyses,
    isAnalyzing: state.code.isAnalyzing,
    progress: state.code.analysisProgress,
    error: state.code.error
  }));
};

// Test generation hooks
export const useTestGeneration = () => {
  return useAppSelector((state) => ({
    currentGeneration: state.testGeneration.currentGeneration,
    generatedTests: state.testGeneration.generatedTests,
    isGenerating: state.testGeneration.isGenerating,
    progress: state.testGeneration.progress,
    options: state.testGeneration.options,
    error: state.testGeneration.error
  }));
};

// Coverage analysis hooks
export const useCoverage = () => {
  return useAppSelector((state) => ({
    currentReport: state.coverage.currentReport,
    reports: state.coverage.reports,
    isAnalyzing: state.coverage.isAnalyzing,
    targetCoverage: state.coverage.targetCoverage,
    recommendations: state.coverage.recommendations,
    error: state.coverage.error
  }));
};

// UI hooks
export const useUI = () => {
  return useAppSelector((state) => ({
    theme: state.ui.theme,
    sidebarOpen: state.ui.sidebarOpen,
    activeTab: state.ui.activeTab,
    notifications: state.ui.notifications,
    codeEditorSettings: state.ui.codeEditorSettings
  }));
};

// Combined hooks for complex components
export const useDashboard = () => {
  const auth = useAuth();
  const user = useUser();
  const code = useCodeAnalysis();
  const testGen = useTestGeneration();
  const coverage = useCoverage();
  
  return useMemo(() => ({
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    recentAnalyses: user.analytics.recentActivity?.filter(a => a.type === 'analyses').slice(0, 5) || [],
    recentGenerations: user.analytics.recentActivity?.filter(a => a.type === 'testGenerations').slice(0, 5) || [],
    usage: user.usage,
    currentAnalysis: code.currentAnalysis,
    currentGeneration: testGen.currentGeneration,
    currentReport: coverage.currentReport,
    isLoading: code.isAnalyzing || testGen.isGenerating || coverage.isAnalyzing
  }), [auth, user, code, testGen, coverage]);
};

// Feature availability hook
export const useFeatureAvailability = () => {
  const { user } = useAuth();
  const { usage } = useUser();
  
  return useMemo(() => {
    const subscription = user?.subscription || { plan: 'free' };
    const limits = usage.limits || {};
    
    return {
      canAnalyzeCode: usage.daily?.analyses < (limits.dailyAnalyses || 10),
      canGenerateTests: usage.monthly?.testGenerations < (limits.monthlyGenerations || 50),
      hasAdvancedFeatures: subscription.plan !== 'free',
      hasPrioritySupport: subscription.features?.prioritySupport || false,
      remainingAnalyses: Math.max(0, (limits.dailyAnalyses || 10) - (usage.daily?.analyses || 0)),
      remainingGenerations: Math.max(0, (limits.monthlyGenerations || 50) - (usage.monthly?.testGenerations || 0))
    };
  }, [user, usage]);
};

export default {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useUser,
  useCodeAnalysis,
  useTestGeneration,
  useCoverage,
  useUI,
  useDashboard,
  useFeatureAvailability
};