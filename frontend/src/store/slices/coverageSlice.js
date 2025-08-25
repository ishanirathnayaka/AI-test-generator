import { createSlice } from '@reduxjs/toolkit';

// Coverage Slice
const coverageSlice = createSlice({
  name: 'coverage',
  initialState: {
    currentReport: null,
    targetCoverage: 80,
    isAnalyzing: false,
    recommendations: [],
    error: null,
  },
  reducers: {
    // TODO: Implement coverage reducers
    setAnalyzing: (state, action) => {
      state.isAnalyzing = action.payload;
    },
    setCoverageReport: (state, action) => {
      state.currentReport = action.payload;
    },
    setTargetCoverage: (state, action) => {
      state.targetCoverage = action.payload;
    },
  },
});

export const coverageActions = coverageSlice.actions;
export default coverageSlice.reducer;