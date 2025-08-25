import React from 'react';
import { Typography, Box } from '@mui/material';

// Dashboard Page
const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Welcome to the AI Test Generator Dashboard. This page will show analytics and recent activity.
      </Typography>
    </Box>
  );
};

export default Dashboard;