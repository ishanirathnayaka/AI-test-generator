import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '@mui/material';

// Layout components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Page components (lazy loaded)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const CodeEditor = React.lazy(() => import('./pages/CodeEditor'));
const TestGeneration = React.lazy(() => import('./pages/TestGeneration'));
const TestResults = React.lazy(() => import('./pages/TestResults'));
const Coverage = React.lazy(() => import('./pages/Coverage'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Redux actions
import { validateToken, clearAuth } from './store/slices/authSlice';
import { initializeApp } from './store/slices/uiSlice';

// Utilities
import { isTokenExpired } from './utils/auth';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  
  // Check if token is expired
  if (token && isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public route component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// App component
const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, token, isLoading } = useSelector((state) => state.auth);
  const { isInitialized } = useSelector((state) => state.ui);

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize UI state
        dispatch(initializeApp());
        
        // Validate token if exists
        if (token && !isTokenExpired(token)) {
          await dispatch(validateToken()).unwrap();
        } else if (token) {
          // Clear expired token
          dispatch(clearAuth());
        }
      } catch (error) {
        console.error('App initialization error:', error);
        dispatch(clearAuth());
      }
    };

    initApp();
  }, [dispatch, token]);

  // Show loading spinner during initialization
  if (!isInitialized || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <LoadingSpinner size={60} />
      </Box>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Code Analysis */}
          <Route path="editor" element={<CodeEditor />} />
          
          {/* Test Generation */}
          <Route path="generate" element={<TestGeneration />} />
          <Route path="tests" element={<TestResults />} />
          
          {/* Coverage Analysis */}
          <Route path="coverage" element={<Coverage />} />
          
          {/* User Profile */}
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 Route */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;