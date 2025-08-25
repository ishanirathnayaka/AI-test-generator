import { createSlice } from '@reduxjs/toolkit';

// User Slice
const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null,
    settings: {},
    usage: {
      daily: 0,
      monthly: 0,
      total: 0,
    },
    isLoading: false,
    error: null,
  },
  reducers: {
    // TODO: Implement user reducers
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setUsage: (state, action) => {
      state.usage = action.payload;
    },
  },
});

export const userActions = userSlice.actions;
export default userSlice.reducer;