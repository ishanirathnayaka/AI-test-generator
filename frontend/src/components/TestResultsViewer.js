import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Toolbar,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  Switch,
  TextField,
  Alert,
  Divider,
  Tooltip,
  Fab
} from '@mui/material';
import {
  ExpandMore,
  Download,
  Share,
  Copy,
  Edit,
  Delete,
  PlayArrow,
  Stop,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Code,
  BugReport,
  Speed,
  Integration,
  FilterList,
  Sort,
  Search,
  MoreVert,
  Visibility,
  VisibilityOff,
  Save,
  FileDownload
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@mui/material/styles';

/**
 * Test Results Viewer Component
 * Comprehensive interface for viewing, managing, and exporting generated test cases
 */
const TestResultsViewer = ({ testResults, onEdit, onDelete, onExport, onRun }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTests, setSelectedTests] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCode, setShowCode] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('file');
  const [runningTests, setRunningTests] = useState(new Set());
  const [testResults_state, setTestResults_state] = useState({});
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);

  const theme = useTheme();

  // Mock test data structure
  const mockTests = {
    unit: [
      {
        id: 'test_1',
        name: 'should calculate sum correctly',
        type: 'unit',
        target: 'calculateSum',
        framework: 'jest',
        code: `test('should calculate sum correctly', () => {
  const result = calculateSum(2, 3);
  expect(result).toBe(5);
});`,
        description: 'Tests basic addition functionality',
        status: 'generated',
        estimatedRunTime: '< 1ms'
      },
      {
        id: 'test_2',
        name: 'should handle negative numbers',
        type: 'unit',
        target: 'calculateSum',
        framework: 'jest',
        code: `test('should handle negative numbers', () => {
  const result = calculateSum(-2, 3);
  expect(result).toBe(1);
});`,
        description: 'Tests addition with negative numbers',
        status: 'generated',
        estimatedRunTime: '< 1ms'
      }
    ],
    integration: [
      {
        id: 'test_3',
        name: 'should integrate with calculator class',
        type: 'integration',
        target: 'Calculator',
        framework: 'jest',
        code: `test('should integrate with calculator class', () => {
  const calc = new Calculator();
  const result = calc.add(2, 3);
  expect(result).toBe(5);
  expect(calc.getHistory()).toContainEqual({
    operation: 'add',
    a: 2,
    b: 3,
    result: 5
  });
});`,
        description: 'Tests integration between methods',
        status: 'generated',
        estimatedRunTime: '< 5ms'
      }
    ],
    errorHandling: [
      {
        id: 'test_4',
        name: 'should throw error for invalid input',
        type: 'error-handling',
        target: 'calculateSum',
        framework: 'jest',
        code: `test('should throw error for invalid input', () => {
  expect(() => calculateSum('a', 2)).toThrow('Both parameters must be numbers');
});`,
        description: 'Tests error handling for invalid inputs',
        status: 'generated',
        estimatedRunTime: '< 1ms'
      }
    ]
  };

  const allTests = Object.values(mockTests).flat();

  // Test type icons
  const getTestTypeIcon = (type) => {
    switch (type) {
      case 'unit':
        return <Code color="primary" />;
      case 'integration':
        return <Integration color="secondary" />;
      case 'error-handling':
        return <BugReport color="error" />;
      case 'performance':
        return <Speed color="warning" />;
      default:
        return <Code />;
    }
  };

  // Test status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'generated':
        return 'default';
      default:
        return 'default';
    }
  };

  // Filter and sort tests
  const getFilteredAndSortedTests = () => {
    let tests = allTests;

    // Filter by type
    if (filterType !== 'all') {
      tests = tests.filter(test => test.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      tests = tests.filter(test => 
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort tests
    tests.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'target':
          return a.target.localeCompare(b.target);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return tests;
  };

  // Handle test selection
  const handleTestSelection = (testId) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const filteredTests = getFilteredAndSortedTests();
    if (selectedTests.length === filteredTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(filteredTests.map(test => test.id));
    }
  };

  // Handle test run
  const handleRunTest = async (testId) => {
    setRunningTests(prev => new Set([...prev, testId]));
    
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock random result
      const passed = Math.random() > 0.3;
      setTestResults_state(prev => ({
        ...prev,
        [testId]: {
          status: passed ? 'passed' : 'failed',
          duration: Math.floor(Math.random() * 100) + 'ms',
          error: passed ? null : 'Expected 5 but received 6'
        }
      }));
    } catch (error) {
      setTestResults_state(prev => ({
        ...prev,
        [testId]: {
          status: 'failed',
          error: error.message
        }
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  // Handle bulk operations
  const handleBulkRun = () => {
    selectedTests.forEach(testId => handleRunTest(testId));
  };

  const handleBulkDelete = () => {
    selectedTests.forEach(testId => onDelete?.(testId));
    setSelectedTests([]);
  };

  // Export functions
  const handleExport = () => {
    const testsToExport = selectedTests.length > 0 
      ? allTests.filter(test => selectedTests.includes(test.id))
      : allTests;

    switch (exportFormat) {
      case 'file':
        exportAsTestFile(testsToExport);
        break;
      case 'json':
        exportAsJSON(testsToExport);
        break;
      case 'clipboard':
        exportToClipboard(testsToExport);
        break;
    }
    
    setExportDialogOpen(false);
  };

  const exportAsTestFile = (tests) => {
    const testContent = tests.map(test => test.code).join('\\n\\n');
    const blob = new Blob([testContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-tests.${tests[0]?.framework === 'pytest' ? 'py' : 'js'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = (tests) => {
    const jsonContent = JSON.stringify(tests, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToClipboard = async (tests) => {
    const testContent = tests.map(test => test.code).join('\\n\\n');
    await navigator.clipboard.writeText(testContent);
  };

  // Menu handlers
  const handleMenuOpen = (event, test) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTest(test);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedTest(null);
  };

  // Tab content
  const renderTabContent = () => {
    const filteredTests = getFilteredAndSortedTests();

    if (filteredTests.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No tests found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'Try adjusting your search criteria' : 'Generate some tests to get started'}
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {filteredTests.map((test) => {
          const isSelected = selectedTests.includes(test.id);
          const isRunning = runningTests.has(test.id);
          const result = testResults_state[test.id];

          return (
            <Grid item xs={12} key={test.id}>
              <Card 
                variant={isSelected ? 'outlined' : 'elevation'}
                sx={{ 
                  borderColor: isSelected ? 'primary.main' : undefined,
                  borderWidth: isSelected ? 2 : undefined
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isSelected}
                          onChange={() => handleTestSelection(test.id)}
                          size="small"
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />

                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getTestTypeIcon(test.type)}
                        <Typography variant="h6">{test.name}</Typography>
                        <Chip 
                          label={test.type} 
                          size="small" 
                          color={
                            test.type === 'unit' ? 'primary' :
                            test.type === 'integration' ? 'secondary' :
                            test.type === 'error-handling' ? 'error' : 'default'
                          }
                        />
                        {result && (
                          <Chip 
                            label={result.status}
                            size="small"
                            color={getStatusColor(result.status)}
                            icon={
                              result.status === 'passed' ? <CheckCircle /> :
                              result.status === 'failed' ? <ErrorIcon /> : undefined
                            }
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" paragraph>
                        {test.description}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip label={`Target: ${test.target}`} size="small" variant="outlined" />
                        <Chip label={`Framework: ${test.framework}`} size="small" variant="outlined" />
                        <Chip label={`Est. time: ${test.estimatedRunTime}`} size="small" variant="outlined" />
                      </Box>

                      {result?.error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {result.error}
                        </Alert>
                      )}

                      {showCode && (
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="subtitle2">Test Code</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <SyntaxHighlighter
                              language={test.framework === 'pytest' ? 'python' : 'javascript'}
                              style={theme.palette.mode === 'dark' ? oneDark : oneLight}
                              customStyle={{
                                fontSize: '14px',
                                borderRadius: '4px'
                              }}
                            >
                              {test.code}
                            </SyntaxHighlighter>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Tooltip title={isRunning ? 'Running...' : 'Run Test'}>
                        <IconButton 
                          onClick={() => handleRunTest(test.id)}
                          disabled={isRunning}
                          color="primary"
                        >
                          {isRunning ? <Stop /> : <PlayArrow />}
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton 
                        onClick={(e) => handleMenuOpen(e, test)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Test Results
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review, run, and manage your generated test cases
        </Typography>
      </Box>

      {/* Toolbar */}
      <Toolbar 
        sx={{ 
          px: { xs: 0 },
          mb: 2,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Filter"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="unit">Unit Tests</MenuItem>
              <MenuItem value="integration">Integration</MenuItem>
              <MenuItem value="error-handling">Error Handling</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="target">Target</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showCode}
                onChange={(e) => setShowCode(e.target.checked)}
                size="small"
              />
            }
            label="Show Code"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleSelectAll}
            size="small"
          >
            {selectedTests.length === getFilteredAndSortedTests().length ? 'Deselect All' : 'Select All'}
          </Button>

          {selectedTests.length > 0 && (
            <>
              <Button
                variant="contained"
                onClick={handleBulkRun}
                startIcon={<PlayArrow />}
                size="small"
              >
                Run Selected ({selectedTests.length})
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => setExportDialogOpen(true)}
                startIcon={<Download />}
                size="small"
              >
                Export
              </Button>
            </>
          )}
        </Box>
      </Toolbar>

      {/* Test Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {mockTests.unit.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unit Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {mockTests.integration.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Integration Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">
                {mockTests.errorHandling.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Error Handling
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {allTests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test List */}
      <Box>
        {renderTabContent()}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleRunTest(selectedTest?.id); handleMenuClose(); }}>
          <ListItemIcon><PlayArrow /></ListItemIcon>
          <ListItemText>Run Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onEdit?.(selectedTest); handleMenuClose(); }}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText>Edit Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigator.clipboard.writeText(selectedTest?.code); handleMenuClose(); }}>
          <ListItemIcon><Copy /></ListItemIcon>
          <ListItemText>Copy Code</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onDelete?.(selectedTest?.id); handleMenuClose(); }}>
          <ListItemIcon><Delete /></ListItemIcon>
          <ListItemText>Delete Test</ListItemText>
        </MenuItem>
      </Menu>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Tests</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              label="Export Format"
            >
              <MenuItem value="file">Test File</MenuItem>
              <MenuItem value="json">JSON Format</MenuItem>
              <MenuItem value="clipboard">Copy to Clipboard</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            {selectedTests.length > 0 
              ? `Exporting ${selectedTests.length} selected test(s)`
              : `Exporting all ${allTests.length} test(s)`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained">Export</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for bulk export */}
      {selectedTests.length > 0 && (
        <Fab
          color="primary"
          onClick={() => setExportDialogOpen(true)}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <FileDownload />
        </Fab>
      )}
    </Paper>
  );
};

export default TestResultsViewer;