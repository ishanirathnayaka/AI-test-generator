import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  padding: theme.spacing(4),
  textAlign: 'center',
}));

const ErrorCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  width: '100%',
  margin: theme.spacing(2),
  boxShadow: theme.shadows[8],
}));

const ErrorIcon = styled(ErrorIcon)(({ theme }) => ({
  fontSize: 80,
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
}));

/**
 * Error Fallback Component
 * @param {Object} props - Component props
 * @param {Error} props.error - The error object
 * @param {Function} props.resetErrorBoundary - Function to reset error boundary
 * @param {string} props.title - Custom error title
 * @param {string} props.message - Custom error message
 * @param {boolean} props.showDetails - Whether to show error details
 * @param {boolean} props.showHomeButton - Whether to show home button
 * @param {Function} props.onHomeClick - Custom home button handler
 */
const ErrorFallback = ({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showDetails = process.env.NODE_ENV === 'development',
  showHomeButton = true,
  onHomeClick,
  ...props
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  // Error reporting function
  const reportError = React.useCallback(() => {
    try {
      // In a real app, you would send this to your error reporting service
      console.error('Error reported:', {
        message: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Send to error reporting service (Sentry, LogRocket, etc.)
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }

      alert('Error report sent successfully!');
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      alert('Failed to send error report. Please try again later.');
    }
  }, [error]);

  // Handle home navigation
  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      window.location.href = '/';
    }
  };

  // Handle page refresh
  const handleRefresh = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  // Get user-friendly error message
  const getUserFriendlyMessage = () => {
    if (!error) return message;

    const errorMessage = error.message || '';
    
    // Common error patterns and their user-friendly messages
    const errorPatterns = {
      'Network Error': 'Unable to connect to the server. Please check your internet connection.',
      'timeout': 'The request took too long to complete. Please try again.',
      'Unauthorized': 'You are not authorized to perform this action. Please log in again.',
      'Forbidden': 'You do not have permission to access this resource.',
      'Not Found': 'The requested resource was not found.',
      'ChunkLoadError': 'Failed to load application resources. Please refresh the page.',
      'TypeError': 'A technical error occurred. Our team has been notified.',
    };

    for (const [pattern, friendlyMessage] of Object.entries(errorPatterns)) {
      if (errorMessage.includes(pattern)) {
        return friendlyMessage;
      }
    }

    return message;
  };

  return (
    <ErrorContainer {...props}>
      <ErrorCard>
        <CardContent>
          <ErrorIcon />
          
          <Typography variant="h4" component="h1" gutterBottom color="error">
            {title}
          </Typography>
          
          <Typography variant="body1" paragraph color="text.secondary">
            {getUserFriendlyMessage()}
          </Typography>

          {/* Error details for development/debugging */}
          {showDetails && error && (
            <>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  startIcon={showErrorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  size="small"
                  variant="outlined"
                >
                  {showErrorDetails ? 'Hide' : 'Show'} Error Details
                </Button>
              </Box>

              <Collapse in={showErrorDetails}>
                <Alert severity="error" sx={{ textAlign: 'left', mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Message:
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {error.message}
                  </Typography>
                  
                  {error.stack && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Stack Trace:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="pre" 
                        sx={{ 
                          fontSize: '0.75rem',
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {error.stack}
                      </Typography>
                    </>
                  )}
                </Alert>
              </Collapse>
            </>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'center', gap: 1, pb: 3 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            color="primary"
          >
            Try Again
          </Button>

          {showHomeButton && (
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleHomeClick}
              color="primary"
            >
              Go Home
            </Button>
          )}

          <Button
            variant="text"
            startIcon={<BugReportIcon />}
            onClick={reportError}
            color="secondary"
            size="small"
          >
            Report Issue
          </Button>
        </CardActions>
      </ErrorCard>

      {/* Additional help text */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, maxWidth: 400 }}>
        If this problem persists, please contact support or try refreshing the page.
        Error ID: {Date.now().toString(36)}
      </Typography>
    </ErrorContainer>
  );
};

/**
 * Simple Error Alert Component
 */
export const ErrorAlert = ({ 
  error, 
  onRetry, 
  onDismiss,
  severity = 'error',
  showRetry = true,
  ...props 
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || 'An error occurred';

  return (
    <Alert 
      severity={severity}
      action={
        <Box>
          {showRetry && onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button color="inherit" size="small" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </Box>
      }
      {...props}
    >
      {errorMessage}
    </Alert>
  );
};

/**
 * Network Error Component
 */
export const NetworkError = ({ onRetry, ...props }) => {
  return (
    <ErrorFallback
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      showHomeButton={false}
      resetErrorBoundary={onRetry}
      {...props}
    />
  );
};

/**
 * Not Found Error Component
 */
export const NotFoundError = ({ resource = 'page', onGoHome, ...props }) => {
  return (
    <ErrorFallback
      title={`${resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found`}
      message={`The ${resource} you are looking for does not exist or has been moved.`}
      showDetails={false}
      onHomeClick={onGoHome}
      {...props}
    />
  );
};

export default ErrorFallback;