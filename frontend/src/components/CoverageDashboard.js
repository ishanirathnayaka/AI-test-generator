import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Timeline,
  Assessment,
  BugReport,
  Speed,
  Code,
  Visibility,
  VisibilityOff,
  Refresh,
  Download,
  Share
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { useTheme } from '@mui/material/styles';

/**
 * Coverage Dashboard Component
 * Comprehensive visualization and reporting for test coverage analysis
 */
const CoverageDashboard = ({ coverageData, onRefresh, onExport }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  const theme = useTheme();

  // Mock coverage data
  const mockCoverageData = {
    overall: {
      percentage: 84.5,
      quality: 'good',
      grade: 'B+'
    },
    breakdown: {
      line: { percentage: 87.2, covered: 152, total: 174 },
      branch: { percentage: 78.9, covered: 45, total: 57 },
      function: { percentage: 95.0, covered: 19, total: 20 },
      statement: { percentage: 86.1, covered: 149, total: 173 }
    },
    gaps: {
      critical: [
        {
          type: 'untested_complex_function',
          target: 'calculateAdvanced',
          severity: 'critical',
          description: 'Complex function "calculateAdvanced" (complexity: 8) has no tests',
          recommendation: 'Add comprehensive unit tests covering all execution paths'
        }
      ],
      major: [
        {
          type: 'low_branch_coverage',
          target: 'overall',
          severity: 'major',
          description: 'Branch coverage is only 78.9%',
          recommendation: 'Add tests for conditional statements and error handling'
        }
      ],
      minor: [
        {
          type: 'missing_error_tests',
          target: 'validateInput',
          severity: 'minor',
          description: 'Function "validateInput" lacks error handling tests',
          recommendation: 'Add tests for invalid inputs and edge cases'
        }
      ]
    },
    improvements: [
      {
        priority: 'high',
        title: 'Add tests for complex functions',
        description: '1 complex function needs comprehensive testing',
        estimatedEffort: 'medium',
        impactOnCoverage: 'high'
      },
      {
        priority: 'medium',
        title: 'Improve branch coverage',
        description: 'Add tests for conditional statements and logical branches',
        estimatedEffort: 'high',
        impactOnCoverage: 'high'
      }
    ],
    fileBreakdown: [
      { file: 'calculator.js', coverage: 95.2, lines: 42, uncovered: 2 },
      { file: 'validator.js', coverage: 78.3, lines: 28, uncovered: 6 },
      { file: 'utils.js', coverage: 88.9, lines: 18, uncovered: 2 }
    ]
  };

  // Historical data for trends
  const mockHistoricalData = [
    { date: '2024-01-01', line: 75, branch: 65, function: 90, statement: 73 },
    { date: '2024-01-08', line: 78, branch: 68, function: 92, statement: 76 },
    { date: '2024-01-15', line: 82, branch: 72, function: 94, statement: 80 },
    { date: '2024-01-22', line: 85, branch: 76, function: 95, statement: 83 },
    { date: '2024-01-29', line: 87, branch: 79, function: 95, statement: 86 }
  ];

  // Color schemes
  const coverageColors = {
    excellent: '#4caf50',
    good: '#8bc34a',
    fair: '#ff9800',
    poor: '#f44336'
  };

  const getCoverageColor = (percentage) => {
    if (percentage >= 90) return coverageColors.excellent;
    if (percentage >= 80) return coverageColors.good;
    if (percentage >= 70) return coverageColors.fair;
    return coverageColors.poor;
  };

  const getCoverageLabel = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Fair';
    return 'Poor';
  };

  // Chart data
  const pieChartData = [
    { name: 'Covered', value: mockCoverageData.breakdown.line.covered, color: '#4caf50' },
    { name: 'Uncovered', value: mockCoverageData.breakdown.line.total - mockCoverageData.breakdown.line.covered, color: '#f44336' }
  ];

  const barChartData = [
    { name: 'Line', percentage: mockCoverageData.breakdown.line.percentage },
    { name: 'Branch', percentage: mockCoverageData.breakdown.branch.percentage },
    { name: 'Function', percentage: mockCoverageData.breakdown.function.percentage },
    { name: 'Statement', percentage: mockCoverageData.breakdown.statement.percentage }
  ];

  // Coverage metric cards
  const CoverageMetricCard = ({ title, data, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3" color={color}>
            {data.percentage.toFixed(1)}%
          </Typography>
          <Chip 
            label={getCoverageLabel(data.percentage)}
            color={
              data.percentage >= 90 ? 'success' :
              data.percentage >= 80 ? 'info' :
              data.percentage >= 70 ? 'warning' : 'error'
            }
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={data.percentage}
          sx={{
            height: 8,
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: getCoverageColor(data.percentage)
            }
          }}
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {data.covered} of {data.total} covered
        </Typography>
      </CardContent>
    </Card>
  );

  // Coverage gaps component
  const CoverageGaps = ({ gaps }) => (
    <Box>
      {gaps.critical.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Critical Issues ({gaps.critical.length})</AlertTitle>
          <List dense>
            {gaps.critical.map((gap, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <ErrorIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={gap.description}
                  secondary={gap.recommendation}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {gaps.major.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Major Issues ({gaps.major.length})</AlertTitle>
          <List dense>
            {gaps.major.map((gap, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <Warning color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary={gap.description}
                  secondary={gap.recommendation}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {gaps.minor.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Minor Issues ({gaps.minor.length})</AlertTitle>
          <List dense>
            {gaps.minor.map((gap, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <Info color="info" />
                </ListItemIcon>
                <ListItemText
                  primary={gap.description}
                  secondary={gap.recommendation}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
    </Box>
  );

  // File breakdown table
  const FileBreakdownTable = ({ files }) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File</TableCell>
            <TableCell>Coverage</TableCell>
            <TableCell>Lines</TableCell>
            <TableCell>Uncovered</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file, index) => (
            <TableRow key={index}>
              <TableCell>{file.file}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ minWidth: 40 }}>
                    {file.coverage.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={file.coverage}
                    sx={{ ml: 1, flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
              </TableCell>
              <TableCell>{file.lines}</TableCell>
              <TableCell>
                <Chip 
                  label={file.uncovered}
                  color={file.uncovered === 0 ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {file.coverage >= 90 ? (
                  <CheckCircle color="success" />
                ) : file.coverage >= 70 ? (
                  <Warning color="warning" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0: // Overview
        return (
          <Grid container spacing={3}>
            {/* Overall Coverage */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Overall Coverage" />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={mockCoverageData.overall.percentage}
                        size={120}
                        thickness={6}
                        sx={{ color: getCoverageColor(mockCoverageData.overall.percentage) }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}
                      >
                        <Typography variant="h4" component="div" color="text.primary">
                          {mockCoverageData.overall.percentage}%
                        </Typography>
                        <Typography variant="h6" component="div" color="text.secondary">
                          {mockCoverageData.overall.grade}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" align="center" gutterBottom>
                    {getCoverageLabel(mockCoverageData.overall.percentage)} Coverage
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" align="center">
                    Quality: {mockCoverageData.overall.quality}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Coverage Breakdown Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Coverage Breakdown" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Coverage']} />
                      <Bar 
                        dataKey="percentage" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Coverage Metrics */}
            <Grid item xs={12} sm={6} md={3}>
              <CoverageMetricCard
                title="Line Coverage"
                data={mockCoverageData.breakdown.line}
                icon={<Code color="primary" />}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CoverageMetricCard
                title="Branch Coverage"
                data={mockCoverageData.breakdown.branch}
                icon={<Timeline color="secondary" />}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CoverageMetricCard
                title="Function Coverage"
                data={mockCoverageData.breakdown.function}
                icon={<Assessment color="success" />}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <CoverageMetricCard
                title="Statement Coverage"
                data={mockCoverageData.breakdown.statement}
                icon={<Speed color="info" />}
                color="info.main"
              />
            </Grid>
          </Grid>
        );

      case 1: // Gaps & Issues
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Coverage Gaps & Issues
            </Typography>
            <CoverageGaps gaps={mockCoverageData.gaps} />
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
              Improvement Suggestions
            </Typography>
            {mockCoverageData.improvements.map((improvement, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={improvement.priority}
                      color={
                        improvement.priority === 'high' ? 'error' :
                        improvement.priority === 'medium' ? 'warning' : 'info'
                      }
                      size="small"
                    />
                    <Typography variant="h6" sx={{ ml: 2 }}>
                      {improvement.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body1" paragraph>
                    {improvement.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={`Effort: ${improvement.estimatedEffort}`} size="small" variant="outlined" />
                    <Chip label={`Impact: ${improvement.impactOnCoverage}`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 2: // File Details
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              File Coverage Breakdown
            </Typography>
            <FileBreakdownTable files={mockCoverageData.fileBreakdown} />
          </Box>
        );

      case 3: // Trends
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Coverage Trends
            </Typography>
            
            <Card>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockHistoricalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="line" stroke="#8884d8" name="Line Coverage" />
                    <Line type="monotone" dataKey="branch" stroke="#82ca9d" name="Branch Coverage" />
                    <Line type="monotone" dataKey="function" stroke="#ffc658" name="Function Coverage" />
                    <Line type="monotone" dataKey="statement" stroke="#ff7300" name="Statement Coverage" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Coverage Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive test coverage analysis and insights
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onExport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={mockCoverageData.overall.grade} color="primary">
                Overview
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge 
                badgeContent={
                  mockCoverageData.gaps.critical.length + 
                  mockCoverageData.gaps.major.length + 
                  mockCoverageData.gaps.minor.length
                } 
                color="error"
              >
                Gaps & Issues
              </Badge>
            } 
          />
          <Tab label="File Details" />
          <Tab label="Trends" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {renderTabContent()}
    </Paper>
  );
};

export default CoverageDashboard;