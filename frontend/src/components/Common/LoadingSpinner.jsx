import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
}));

const StyledCircularProgress = styled(CircularProgress)(({ theme, size }) => ({
  color: theme.palette.primary.main,
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'round',
  },
}));

/**
 * Loading Spinner Component
 * @param {Object} props - Component props
 * @param {number} props.size - Size of the spinner (default: 40)
 * @param {string} props.message - Loading message to display
 * @param {string} props.color - Color of the spinner
 * @param {boolean} props.overlay - Whether to show as overlay
 * @param {number} props.thickness - Thickness of the spinner
 * @param {Object} props.sx - Additional styling
 */
const LoadingSpinner = ({
  size = 40,
  message,
  color = 'primary',
  overlay = false,
  thickness = 3.6,
  sx = {},
  ...props
}) => {
  const containerSx = overlay
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
        ...sx,
      }
    : sx;

  return (
    <LoadingContainer sx={containerSx} {...props}>
      <StyledCircularProgress
        size={size}
        thickness={thickness}
        color={color}
        aria-label="Loading"
      />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ maxWidth: 300 }}
        >
          {message}
        </Typography>
      )}
    </LoadingContainer>
  );
};

/**
 * Inline Loading Spinner (smaller, for buttons/inputs)
 */
export const InlineLoadingSpinner = ({ size = 20, ...props }) => {
  return (
    <StyledCircularProgress
      size={size}
      thickness={4}
      {...props}
    />
  );
};

/**
 * Full Page Loading Spinner
 */
export const FullPageLoadingSpinner = ({ message = 'Loading...', ...props }) => {
  return (
    <LoadingSpinner
      overlay
      size={60}
      message={message}
      {...props}
    />
  );
};

/**
 * Loading Skeleton for content placeholders
 */
export const LoadingSkeleton = ({ width = '100%', height = 20, variant = 'rectangular' }) => {
  return (
    <Box
      sx={{
        width,
        height,
        backgroundColor: 'grey.300',
        borderRadius: variant === 'circular' ? '50%' : 1,
        animation: 'pulse 1.5s ease-in-out infinite',
        '@keyframes pulse': {
          '0%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.4,
          },
          '100%': {
            opacity: 1,
          },
        },
      }}
    />
  );
};

/**
 * Loading Dots Animation
 */
export const LoadingDots = ({ color = 'primary.main', size = 8 }) => {
  const DotContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: size / 2,
  });

  const Dot = styled(Box)(({ theme, delay }) => ({
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: theme.palette[color] || color,
    animation: `dot-flashing 1.4s infinite linear`,
    animationDelay: `${delay}s`,
    '@keyframes dot-flashing': {
      '0%': {
        opacity: 0.2,
      },
      '20%': {
        opacity: 1,
      },
      '100%': {
        opacity: 0.2,
      },
    },
  }));

  return (
    <DotContainer>
      <Dot delay={0} />
      <Dot delay={0.2} />
      <Dot delay={0.4} />
    </DotContainer>
  );
};

/**
 * Progress Bar Loading
 */
export const ProgressBarLoading = ({ 
  progress = 0, 
  message, 
  showPercentage = true,
  height = 8,
  color = 'primary.main'
}) => {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {message && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {message}
        </Typography>
      )}
      <Box
        sx={{
          width: '100%',
          height,
          backgroundColor: 'grey.300',
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            height: '100%',
            backgroundColor: color,
            borderRadius: height / 2,
            transition: 'width 0.3s ease',
            width: `${Math.max(0, Math.min(100, progress))}%`,
          }}
        />
      </Box>
      {showPercentage && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}
        >
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;