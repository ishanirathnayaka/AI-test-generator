import { createSlice } from '@reduxjs/toolkit';

// Test Generation Slice
const testGenerationSlice = createSlice({
  name: 'testGeneration',
  initialState: {
    isGenerating: false,
    progress: 0,
    currentStep: '',
    generatedTests: [],
    selectedFramework: 'jest',
    options: {
      includeEdgeCases: true,
      mockExternal: true,
      generateFixtures: false,
    },
    error: null,
  },
  reducers: {
    // TODO: Implement test generation reducers
    setGenerating: (state, action) => {
      state.isGenerating = action.payload;
    },
    setProgress: (state, action) => {
      state.progress = action.payload;
    },
    setGeneratedTests: (state, action) => {
      state.generatedTests = action.payload;
    },
  },
});

export const testGenerationActions = testGenerationSlice.actions;
export const testGenerationReducer = testGenerationSlice.reducer;