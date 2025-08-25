import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import codeService from '../../services/codeService';

// Initial state
const initialState = {
  // Current code
  sourceCode: '',
  language: 'javascript',
  fileName: '',
  
  // Analysis results
  analysis: null,
  isAnalyzing: false,
  analysisError: null,
  
  // File management
  uploadedFiles: [],
  isUploading: false,
  uploadError: null,
  
  // Code history
  codeHistory: [],
  currentHistoryIndex: -1,
  
  // Validation
  syntaxErrors: [],
  warnings: [],
};

// Async thunks
export const analyzeCode = createAsyncThunk(
  'code/analyzeCode',
  async ({ code, language }, { rejectWithValue }) => {
    try {
      const response = await codeService.analyzeCode(code, language);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error || 'Code analysis failed',
        code: error.response?.data?.code,
      });
    }
  }
);

export const uploadCodeFile = createAsyncThunk(
  'code/uploadCodeFile',
  async (file, { rejectWithValue }) => {
    try {
      const response = await codeService.uploadFile(file);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error || 'File upload failed',
        code: error.response?.data?.code,
      });
    }
  }
);

// Code slice
const codeSlice = createSlice({
  name: 'code',
  initialState,
  reducers: {
    // Code management
    setSourceCode: (state, action) => {
      const { code, addToHistory = true } = action.payload;
      
      // Add to history if different from current
      if (addToHistory && code !== state.sourceCode) {
        state.codeHistory.push({
          code: state.sourceCode,
          timestamp: new Date().toISOString(),
          language: state.language,
        });
        
        // Limit history to 50 entries
        if (state.codeHistory.length > 50) {
          state.codeHistory = state.codeHistory.slice(-50);
        }
        
        state.currentHistoryIndex = state.codeHistory.length - 1;
      }
      
      state.sourceCode = code;
    },
    
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    
    setFileName: (state, action) => {
      state.fileName = action.payload;
    },
    
    // History management
    undoCode: (state) => {
      if (state.currentHistoryIndex >= 0) {
        const historyItem = state.codeHistory[state.currentHistoryIndex];
        state.sourceCode = historyItem.code;
        state.language = historyItem.language;
        state.currentHistoryIndex -= 1;
      }
    },
    
    redoCode: (state) => {
      if (state.currentHistoryIndex < state.codeHistory.length - 1) {
        state.currentHistoryIndex += 1;
        const historyItem = state.codeHistory[state.currentHistoryIndex];
        state.sourceCode = historyItem.code;
        state.language = historyItem.language;
      }
    },
    
    clearHistory: (state) => {
      state.codeHistory = [];
      state.currentHistoryIndex = -1;
    },
    
    // Validation
    setSyntaxErrors: (state, action) => {
      state.syntaxErrors = action.payload;
    },
    
    setWarnings: (state, action) => {
      state.warnings = action.payload;
    },
    
    clearValidation: (state) => {
      state.syntaxErrors = [];
      state.warnings = [];
    },
    
    // Clear state
    clearCode: (state) => {
      state.sourceCode = '';
      state.fileName = '';
      state.analysis = null;
      state.syntaxErrors = [];
      state.warnings = [];
      state.analysisError = null;
    },
    
    clearAnalysis: (state) => {
      state.analysis = null;
      state.analysisError = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Analyze Code
      .addCase(analyzeCode.pending, (state) => {
        state.isAnalyzing = true;
        state.analysisError = null;
      })
      .addCase(analyzeCode.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.analysis = action.payload;
        state.analysisError = null;
      })
      .addCase(analyzeCode.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.analysisError = action.payload;
      })
      
      // Upload Code File
      .addCase(uploadCodeFile.pending, (state) => {
        state.isUploading = true;
        state.uploadError = null;
      })
      .addCase(uploadCodeFile.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadedFiles.push(action.payload);
        state.uploadError = null;
      })
      .addCase(uploadCodeFile.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadError = action.payload;
      });
  },
});

// Export actions
export const {
  setSourceCode,
  setLanguage,
  setFileName,
  undoCode,
  redoCode,
  clearHistory,
  setSyntaxErrors,
  setWarnings,
  clearValidation,
  clearCode,
  clearAnalysis,
} = codeSlice.actions;

// Selectors
export const selectCode = (state) => state.code;
export const selectSourceCode = (state) => state.code.sourceCode;
export const selectLanguage = (state) => state.code.language;
export const selectFileName = (state) => state.code.fileName;
export const selectAnalysis = (state) => state.code.analysis;
export const selectIsAnalyzing = (state) => state.code.isAnalyzing;
export const selectAnalysisError = (state) => state.code.analysisError;
export const selectCodeHistory = (state) => state.code.codeHistory;
export const selectCanUndo = (state) => state.code.currentHistoryIndex >= 0;
export const selectCanRedo = (state) => state.code.currentHistoryIndex < state.code.codeHistory.length - 1;
export const selectSyntaxErrors = (state) => state.code.syntaxErrors;
export const selectWarnings = (state) => state.code.warnings;

export default codeSlice.reducer;