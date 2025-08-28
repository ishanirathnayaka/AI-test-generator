import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { coverageAnalysisService } from '../../services';

// Async thunks for coverage operations
export const analyzeCoverage = createAsyncThunk(
  'coverage/analyze',
  async (analysisData, { rejectWithValue }) => {
    try {
      const result = await coverageAnalysisService.analyzeCoverage(analysisData);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Coverage analysis failed');
    }
  }
);

export const getCoverageReport = createAsyncThunk(
  'coverage/getReport',
  async (reportId, { rejectWithValue }) => {
    try {
      const result = await coverageAnalysisService.getCoverageReport(reportId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch coverage report');
    }
  }
);

export const getUserCoverageReports = createAsyncThunk(
  'coverage/getUserReports',
  async (params, { rejectWithValue }) => {
    try {
      const result = await coverageAnalysisService.getUserCoverageReports(params);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch coverage reports');
    }
  }
);

export const deleteCoverageReport = createAsyncThunk(
  'coverage/deleteReport',
  async (reportId, { rejectWithValue }) => {
    try {
      await coverageAnalysisService.deleteCoverageReport(reportId);
      return reportId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete coverage report');
    }
  }
);

// Coverage Slice
const coverageSlice = createSlice({
  name: 'coverage',
  initialState: {
    // Current analysis state
    isAnalyzing: false,
    analysisProgress: 0,
    analysisStep: '',
    
    // Coverage reports
    currentReport: null,
    reports: [],
    reportsLoading: false,
    
    // Coverage settings
    targetCoverage: {
      line: 80,
      branch: 75,
      function: 90,
      statement: 80
    },
    
    // Analysis configuration
    analysisConfig: {
      includeTestFiles: false,
      excludePatterns: ['node_modules', 'dist', 'build'],
      coverageThresholds: {
        global: 80,
        perFile: 70
      }
    },
    
    // Coverage insights
    recommendations: [],
    gaps: [],
    trends: [],
    
    // UI state
    selectedMetric: 'line',
    viewMode: 'overview', // overview, details, trends
    filters: {
      severity: 'all',
      fileType: 'all',
      dateRange: 'week'
    },
    
    // Error handling
    error: null,
    lastUpdated: null
  },
  reducers: {
    // Analysis control
    setAnalyzing: (state, action) => {
      state.isAnalyzing = action.payload;
      if (action.payload) {
        state.error = null;
        state.analysisProgress = 0;
        state.analysisStep = 'Initializing...';
      }
    },
    
    setAnalysisProgress: (state, action) => {
      const { progress, step } = action.payload;
      state.analysisProgress = progress;
      if (step) state.analysisStep = step;
    },
    
    // Coverage report management
    setCoverageReport: (state, action) => {
      state.currentReport = action.payload;
      state.lastUpdated = new Date().toISOString();
      if (action.payload) {
        state.error = null;
      }
    },
    
    addCoverageReport: (state, action) => {
      state.reports.unshift(action.payload);
    },
    
    updateCoverageReport: (state, action) => {
      const index = state.reports.findIndex(report => report.id === action.payload.id);
      if (index !== -1) {
        state.reports[index] = action.payload;
      }
    },
    
    removeCoverageReport: (state, action) => {
      state.reports = state.reports.filter(report => report.id !== action.payload);
      if (state.currentReport && state.currentReport.id === action.payload) {
        state.currentReport = null;
      }
    },
    
    // Configuration updates
    setTargetCoverage: (state, action) => {
      state.targetCoverage = { ...state.targetCoverage, ...action.payload };
    },
    
    updateAnalysisConfig: (state, action) => {
      state.analysisConfig = { ...state.analysisConfig, ...action.payload };
    },
    
    // Insights and recommendations
    setRecommendations: (state, action) => {
      state.recommendations = action.payload;
    },
    
    setCoverageGaps: (state, action) => {
      state.gaps = action.payload;
    },
    
    setCoverageTrends: (state, action) => {
      state.trends = action.payload;
    },
    
    // UI state management
    setSelectedMetric: (state, action) => {
      state.selectedMetric = action.payload;
    },
    
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Error handling
    setError: (state, action) => {
      state.error = action.payload;
      state.isAnalyzing = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    resetCoverageState: (state) => {
      state.isAnalyzing = false;
      state.analysisProgress = 0;
      state.analysisStep = '';
      state.currentReport = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Analyze coverage
    builder
      .addCase(analyzeCoverage.pending, (state) => {
        state.isAnalyzing = true;
        state.error = null;
        state.analysisProgress = 0;
        state.analysisStep = 'Starting coverage analysis...';
      })
      .addCase(analyzeCoverage.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.analysisProgress = 100;
        state.analysisStep = 'Analysis complete';
        state.currentReport = action.payload.data;
        state.recommendations = action.payload.data.recommendations || [];
        state.gaps = action.payload.data.gaps || [];
        state.lastUpdated = new Date().toISOString();
        
        // Add to reports list
        state.reports.unshift(action.payload.data);
      })
      .addCase(analyzeCoverage.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.error = action.payload;
        state.analysisStep = 'Analysis failed';
      });
    
    // Get coverage report
    builder
      .addCase(getCoverageReport.pending, (state) => {
        state.reportsLoading = true;
        state.error = null;
      })
      .addCase(getCoverageReport.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.currentReport = action.payload.data;
      })
      .addCase(getCoverageReport.rejected, (state, action) => {
        state.reportsLoading = false;
        state.error = action.payload;
      });
    
    // Get user coverage reports
    builder
      .addCase(getUserCoverageReports.pending, (state) => {
        state.reportsLoading = true;
        state.error = null;
      })
      .addCase(getUserCoverageReports.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.reports = action.payload.data;
      })
      .addCase(getUserCoverageReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.error = action.payload;
      });
    
    // Delete coverage report
    builder
      .addCase(deleteCoverageReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter(report => report.id !== action.payload);
        if (state.currentReport && state.currentReport.id === action.payload) {
          state.currentReport = null;
        }
      })
      .addCase(deleteCoverageReport.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

// Action creators
export const {
  setAnalyzing,
  setAnalysisProgress,
  setCoverageReport,
  addCoverageReport,
  updateCoverageReport,
  removeCoverageReport,
  setTargetCoverage,
  updateAnalysisConfig,
  setRecommendations,
  setCoverageGaps,
  setCoverageTrends,
  setSelectedMetric,
  setViewMode,
  updateFilters,
  setError,
  clearError,
  resetCoverageState
} = coverageSlice.actions;

// Selectors
export const selectCoverage = (state) => state.coverage;
export const selectCurrentReport = (state) => state.coverage.currentReport;
export const selectCoverageReports = (state) => state.coverage.reports;
export const selectIsAnalyzing = (state) => state.coverage.isAnalyzing;
export const selectAnalysisProgress = (state) => state.coverage.analysisProgress;
export const selectTargetCoverage = (state) => state.coverage.targetCoverage;
export const selectRecommendations = (state) => state.coverage.recommendations;
export const selectCoverageGaps = (state) => state.coverage.gaps;
export const selectCoverageError = (state) => state.coverage.error;

export default coverageSlice.reducer;