import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Async thunks for test generation operations
export const generateTests = createAsyncThunk(
  'testGeneration/generate',
  async (generationData, { rejectWithValue, dispatch }) => {
    try {
      // Start generation
      dispatch(setGenerating(true));
      dispatch(setProgress({ progress: 10, step: 'Analyzing code structure...' }));
      
      const response = await api.post('/code/generate-tests', generationData);
      
      // Simulate progress updates
      dispatch(setProgress({ progress: 50, step: 'Generating test cases...' }));
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Test generation failed');
    }
  }
);

export const getTestGeneration = createAsyncThunk(
  'testGeneration/getGeneration',
  async (generationId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/code/tests/${generationId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch test generation');
    }
  }
);

export const getUserTestGenerations = createAsyncThunk(
  'testGeneration/getUserGenerations',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/code/tests', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch test generations');
    }
  }
);

export const deleteTestGeneration = createAsyncThunk(
  'testGeneration/deleteGeneration',
  async (generationId, { rejectWithValue }) => {
    try {
      await api.delete(`/code/tests/${generationId}`);
      return generationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete test generation');
    }
  }
);

export const exportTests = createAsyncThunk(
  'testGeneration/export',
  async ({ generationId, format }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/code/tests/${generationId}/export`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export tests');
    }
  }
);

// Test Generation Slice
const testGenerationSlice = createSlice({
  name: 'testGeneration',
  initialState: {
    // Generation state
    isGenerating: false,
    progress: 0,
    currentStep: '',
    
    // Generation results
    currentGeneration: null,
    generations: [],
    generationsLoading: false,
    
    // Generation configuration
    selectedFramework: 'jest',
    selectedLanguage: 'javascript',
    aiModel: 'CodeT5',
    
    // Generation options
    options: {
      includeEdgeCases: true,
      mockExternal: true,
      generateFixtures: false,
      includePerformanceTests: false,
      includeIntegrationTests: false,
      testNamingConvention: 'descriptive',
      assertionStyle: 'expect',
      coverageTarget: 80
    },
    
    // Advanced options
    advancedOptions: {
      maxTestsPerFunction: 5,
      complexityThreshold: 3,
      includeDocstring: true,
      generateMocks: 'auto',
      testTimeout: 5000,
      parallelExecution: false
    },
    
    // Generated tests
    generatedTests: [],
    selectedTests: [],
    testStats: {
      total: 0,
      unit: 0,
      integration: 0,
      edge: 0
    },
    
    // UI state
    activeStep: 0,
    viewMode: 'list', // list, tree, split
    filters: {
      testType: 'all',
      complexity: 'all',
      status: 'all'
    },
    
    // Preview and editing
    previewTest: null,
    editingTest: null,
    
    // Export state
    isExporting: false,
    exportFormat: 'files',
    
    // Error handling
    error: null,
    lastUpdated: null,
    
    // History
    generationHistory: []
  },
  reducers: {
    // Generation control
    setGenerating: (state, action) => {
      state.isGenerating = action.payload;
      if (action.payload) {
        state.error = null;
        state.progress = 0;
        state.currentStep = 'Initializing...';
      }
    },
    
    setProgress: (state, action) => {
      const { progress, step } = action.payload;
      state.progress = progress;
      if (step) state.currentStep = step;
    },
    
    // Configuration updates
    setFramework: (state, action) => {
      state.selectedFramework = action.payload;
    },
    
    setLanguage: (state, action) => {
      state.selectedLanguage = action.payload;
    },
    
    setAiModel: (state, action) => {
      state.aiModel = action.payload;
    },
    
    updateOptions: (state, action) => {
      state.options = { ...state.options, ...action.payload };
    },
    
    updateAdvancedOptions: (state, action) => {
      state.advancedOptions = { ...state.advancedOptions, ...action.payload };
    },
    
    // Generation results
    setCurrentGeneration: (state, action) => {
      state.currentGeneration = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    setGeneratedTests: (state, action) => {
      state.generatedTests = action.payload;
      // Calculate stats
      const stats = {
        total: action.payload.length,
        unit: action.payload.filter(test => test.type === 'unit').length,
        integration: action.payload.filter(test => test.type === 'integration').length,
        edge: action.payload.filter(test => test.type === 'edge').length
      };
      state.testStats = stats;
    },
    
    addGeneratedTest: (state, action) => {
      state.generatedTests.push(action.payload);
      state.testStats.total += 1;
      if (action.payload.type) {
        state.testStats[action.payload.type] += 1;
      }
    },
    
    updateGeneratedTest: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.generatedTests.findIndex(test => test.id === id);
      if (index !== -1) {
        state.generatedTests[index] = { ...state.generatedTests[index], ...updates };
      }
    },
    
    removeGeneratedTest: (state, action) => {
      const testId = action.payload;
      const testIndex = state.generatedTests.findIndex(test => test.id === testId);
      if (testIndex !== -1) {
        const test = state.generatedTests[testIndex];
        state.generatedTests.splice(testIndex, 1);
        state.testStats.total -= 1;
        if (test.type) {
          state.testStats[test.type] -= 1;
        }
      }
    },
    
    // Test selection
    toggleTestSelection: (state, action) => {
      const testId = action.payload;
      const index = state.selectedTests.indexOf(testId);
      if (index > -1) {
        state.selectedTests.splice(index, 1);
      } else {
        state.selectedTests.push(testId);
      }
    },
    
    selectAllTests: (state) => {
      state.selectedTests = state.generatedTests.map(test => test.id);
    },
    
    clearTestSelection: (state) => {
      state.selectedTests = [];
    },
    
    // Generation management
    addGeneration: (state, action) => {
      state.generations.unshift(action.payload);
      state.generationHistory.push({
        id: action.payload.id,
        timestamp: new Date().toISOString(),
        framework: state.selectedFramework,
        language: state.selectedLanguage,
        testCount: action.payload.tests?.length || 0
      });
    },
    
    updateGeneration: (state, action) => {
      const index = state.generations.findIndex(gen => gen.id === action.payload.id);
      if (index !== -1) {
        state.generations[index] = action.payload;
      }
    },
    
    removeGeneration: (state, action) => {
      state.generations = state.generations.filter(gen => gen.id !== action.payload);
      if (state.currentGeneration && state.currentGeneration.id === action.payload) {
        state.currentGeneration = null;
      }
    },
    
    // UI state
    setActiveStep: (state, action) => {
      state.activeStep = action.payload;
    },
    
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Preview and editing
    setPreviewTest: (state, action) => {
      state.previewTest = action.payload;
    },
    
    setEditingTest: (state, action) => {
      state.editingTest = action.payload;
    },
    
    // Export
    setExporting: (state, action) => {
      state.isExporting = action.payload;
    },
    
    setExportFormat: (state, action) => {
      state.exportFormat = action.payload;
    },
    
    // Error handling
    setError: (state, action) => {
      state.error = action.payload;
      state.isGenerating = false;
      state.isExporting = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    resetGenerationState: (state) => {
      state.isGenerating = false;
      state.progress = 0;
      state.currentStep = '';
      state.generatedTests = [];
      state.selectedTests = [];
      state.previewTest = null;
      state.editingTest = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Generate tests
    builder
      .addCase(generateTests.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
        state.progress = 0;
      })
      .addCase(generateTests.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.progress = 100;
        state.currentStep = 'Generation complete';
        state.currentGeneration = action.payload.data;
        state.generatedTests = action.payload.data.tests || [];
        
        // Calculate stats
        const tests = action.payload.data.tests || [];
        state.testStats = {
          total: tests.length,
          unit: tests.filter(test => test.type === 'unit').length,
          integration: tests.filter(test => test.type === 'integration').length,
          edge: tests.filter(test => test.type === 'edge').length
        };
        
        // Add to generations list
        state.generations.unshift(action.payload.data);
        
        // Update history
        state.generationHistory.push({
          id: action.payload.data.id,
          timestamp: new Date().toISOString(),
          framework: state.selectedFramework,
          language: state.selectedLanguage,
          testCount: tests.length
        });
      })
      .addCase(generateTests.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload;
        state.currentStep = 'Generation failed';
      });
    
    // Get test generation
    builder
      .addCase(getTestGeneration.pending, (state) => {
        state.generationsLoading = true;
      })
      .addCase(getTestGeneration.fulfilled, (state, action) => {
        state.generationsLoading = false;
        state.currentGeneration = action.payload.data;
        state.generatedTests = action.payload.data.tests || [];
      })
      .addCase(getTestGeneration.rejected, (state, action) => {
        state.generationsLoading = false;
        state.error = action.payload;
      });
    
    // Get user test generations
    builder
      .addCase(getUserTestGenerations.pending, (state) => {
        state.generationsLoading = true;
      })
      .addCase(getUserTestGenerations.fulfilled, (state, action) => {
        state.generationsLoading = false;
        state.generations = action.payload.data;
      })
      .addCase(getUserTestGenerations.rejected, (state, action) => {
        state.generationsLoading = false;
        state.error = action.payload;
      });
    
    // Delete test generation
    builder
      .addCase(deleteTestGeneration.fulfilled, (state, action) => {
        state.generations = state.generations.filter(gen => gen.id !== action.payload);
        if (state.currentGeneration && state.currentGeneration.id === action.payload) {
          state.currentGeneration = null;
          state.generatedTests = [];
        }
      })
      .addCase(deleteTestGeneration.rejected, (state, action) => {
        state.error = action.payload;
      });
    
    // Export tests
    builder
      .addCase(exportTests.pending, (state) => {
        state.isExporting = true;
        state.error = null;
      })
      .addCase(exportTests.fulfilled, (state, action) => {
        state.isExporting = false;
        // Handle export success - could trigger download
      })
      .addCase(exportTests.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.payload;
      });
  }
});

// Action creators
export const {
  setGenerating,
  setProgress,
  setFramework,
  setLanguage,
  setAiModel,
  updateOptions,
  updateAdvancedOptions,
  setCurrentGeneration,
  setGeneratedTests,
  addGeneratedTest,
  updateGeneratedTest,
  removeGeneratedTest,
  toggleTestSelection,
  selectAllTests,
  clearTestSelection,
  addGeneration,
  updateGeneration,
  removeGeneration,
  setActiveStep,
  setViewMode,
  updateFilters,
  setPreviewTest,
  setEditingTest,
  setExporting,
  setExportFormat,
  setError,
  clearError,
  resetGenerationState
} = testGenerationSlice.actions;

// Selectors
export const selectTestGeneration = (state) => state.testGeneration;
export const selectIsGenerating = (state) => state.testGeneration.isGenerating;
export const selectGenerationProgress = (state) => state.testGeneration.progress;
export const selectCurrentGeneration = (state) => state.testGeneration.currentGeneration;
export const selectGeneratedTests = (state) => state.testGeneration.generatedTests;
export const selectSelectedTests = (state) => state.testGeneration.selectedTests;
export const selectGenerationOptions = (state) => state.testGeneration.options;
export const selectTestStats = (state) => state.testGeneration.testStats;
export const selectGenerationError = (state) => state.testGeneration.error;

export const testGenerationReducer = testGenerationSlice.reducer;
export default testGenerationSlice.reducer;