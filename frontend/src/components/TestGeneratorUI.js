import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  Slider,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  Stop,
  Settings,
  Code,
  BugReport,
  Speed,
  Security,
  Info,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from './CodeEditor';

/**
 * Test Generator UI Component
 * Comprehensive interface for configuring and generating AI-powered tests
 */
const TestGeneratorUI = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [fileName, setFileName] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('jest');
  const [generationConfig, setGenerationConfig] = useState({
    includeUnitTests: true,
    includeIntegrationTests: true,
    includeErrorHandling: true,
    includePerformanceTests: false,
    maxTestsPerFunction: 5,
    complexityThreshold: 3,
    aiSettings: {
      temperature: 0.7,
      maxTokens: 2048,
      model: 'microsoft/CodeBERT-base'
    }
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errors, setErrors] = useState([]);

  const dispatch = useDispatch();

  // Supported frameworks by language
  const frameworksByLanguage = {
    javascript: ['jest', 'mocha', 'vitest', 'jasmine'],
    typescript: ['jest', 'mocha', 'vitest', 'jasmine'],
    python: ['pytest', 'unittest', 'nose2'],
    java: ['junit', 'testng', 'spock'],
    cpp: ['gtest', 'catch2', 'boost-test'],
    csharp: ['nunit', 'xunit', 'mstest']
  };

  // AI Models
  const aiModels = [
    { value: 'microsoft/CodeBERT-base', label: 'CodeBERT Base', description: 'General code understanding' },
    { value: 'Salesforce/codet5-base', label: 'CodeT5 Base', description: 'Code-to-code generation' },
    { value: 'Salesforce/codet5-large', label: 'CodeT5 Large', description: 'Advanced code generation' },
    { value: 'Salesforce/codegen-350M-mono', label: 'CodeGen 350M', description: 'Fast code generation' }
  ];

  // Steps for the test generation process
  const steps = [
    {
      label: 'Code Input',
      description: 'Provide the source code to generate tests for'
    },
    {
      label: 'Configuration',
      description: 'Configure test generation options and AI settings'
    },
    {
      label: 'Generation',
      description: 'Generate AI-powered test cases'
    },
    {
      label: 'Review',
      description: 'Review and customize generated tests'
    }
  ];

  // Handle step navigation
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setCode('');
    setAnalysisResult(null);
    setErrors([]);
    setIsGenerating(false);
    setGenerationProgress(0);
  };

  // Handle code change
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setErrors([]); // Clear previous errors
  };

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    // Update framework to default for new language
    const frameworks = frameworksByLanguage[newLanguage];
    if (frameworks && frameworks.length > 0) {
      setSelectedFramework(frameworks[0]);
    }
  };

  // Handle configuration changes
  const handleConfigChange = (key, value) => {
    setGenerationConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAISettingChange = (key, value) => {
    setGenerationConfig(prev => ({
      ...prev,
      aiSettings: {
        ...prev.aiSettings,
        [key]: value
      }
    }));
  };

  // Validate code input
  const validateCodeInput = () => {
    const newErrors = [];
    
    if (!code.trim()) {
      newErrors.push({ type: 'error', message: 'Code is required' });
    } else if (code.length < 10) {
      newErrors.push({ type: 'error', message: 'Code is too short (minimum 10 characters)' });
    } else if (code.length > 100000) {
      newErrors.push({ type: 'error', message: 'Code is too long (maximum 100,000 characters)' });
    }

    if (!language) {
      newErrors.push({ type: 'error', message: 'Programming language must be selected' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Simulate code analysis
  const performCodeAnalysis = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Analyzing code structure...');

    try {
      // Simulate analysis progress
      for (let i = 0; i <= 100; i += 10) {
        setGenerationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (i === 30) setGenerationStatus('Extracting functions and classes...');
        if (i === 60) setGenerationStatus('Calculating complexity metrics...');
        if (i === 90) setGenerationStatus('Finalizing analysis...');
      }

      // Mock analysis result
      const mockAnalysis = {
        id: 'analysis_' + Date.now(),
        language,
        fileName: fileName || 'untitled',
        functions: [
          {
            name: 'calculateSum',
            parameters: [
              { name: 'a', type: 'number' },
              { name: 'b', type: 'number' }
            ],
            returnType: 'number',
            complexity: 2,
            startLine: 1,
            endLine: 5
          }
        ],
        classes: [],
        metrics: {
          linesOfCode: code.split('\n').length,
          cyclomaticComplexity: 3,
          maintainabilityIndex: 85
        },
        syntaxErrors: [],
        warnings: []
      };

      setAnalysisResult(mockAnalysis);
      setGenerationStatus('Analysis completed');
      handleNext();

    } catch (error) {
      setErrors([{ type: 'error', message: 'Analysis failed: ' + error.message }]);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Generate tests
  const generateTests = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing AI models...');

    try {
      // Simulate test generation progress
      const stages = [
        'Preparing code context...',
        'Generating unit tests...',
        'Generating integration tests...',
        'Generating error handling tests...',
        'Optimizing test cases...',
        'Finalizing generation...'
      ];

      for (let i = 0; i < stages.length; i++) {
        setGenerationStatus(stages[i]);
        setGenerationProgress((i + 1) * (100 / stages.length));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setGenerationStatus('Test generation completed');
      handleNext();

    } catch (error) {
      setErrors([{ type: 'error', message: 'Test generation failed: ' + error.message }]);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Render step content
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Source Code Input
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Paste or type your source code below. The system will analyze it and generate comprehensive test cases.
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="File Name (Optional)"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g., calculator.js"
                  helperText="Helps with language detection and organization"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Programming Language</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    label="Programming Language"
                  >
                    <MenuItem value="javascript">JavaScript</MenuItem>
                    <MenuItem value="typescript">TypeScript</MenuItem>
                    <MenuItem value="python">Python</MenuItem>
                    <MenuItem value="java">Java</MenuItem>
                    <MenuItem value="cpp">C++</MenuItem>
                    <MenuItem value="csharp">C#</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <CodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  height="400px"
                  placeholder="Enter your source code here..."
                />
              </Grid>

              {errors.length > 0 && (
                <Grid item xs={12}>
                  {errors.map((error, index) => (
                    <Alert key={index} severity={error.type} sx={{ mb: 1 }}>
                      {error.message}
                    </Alert>
                  ))}
                </Grid>
              )}

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (validateCodeInput()) {
                        performCodeAnalysis();
                      }
                    }}
                    disabled={isGenerating}
                    startIcon={isGenerating ? <Stop /> : <PlayArrow />}
                  >
                    {isGenerating ? 'Analyzing...' : 'Analyze Code'}
                  </Button>
                </Box>
              </Grid>

              {isGenerating && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      {generationStatus}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={generationProgress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Generation Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure how tests should be generated for your code.
            </Typography>

            <Grid container spacing={3}>
              {/* Framework Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Test Framework</InputLabel>
                  <Select
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value)}
                    label="Test Framework"
                  >
                    {frameworksByLanguage[language]?.map((framework) => (
                      <MenuItem key={framework} value={framework}>
                        {framework.charAt(0).toUpperCase() + framework.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Test Types */}
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Test Types</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generationConfig.includeUnitTests}
                            onChange={(e) => handleConfigChange('includeUnitTests', e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography>Unit Tests</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Test individual functions and methods
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generationConfig.includeIntegrationTests}
                            onChange={(e) => handleConfigChange('includeIntegrationTests', e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography>Integration Tests</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Test interactions between components
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generationConfig.includeErrorHandling}
                            onChange={(e) => handleConfigChange('includeErrorHandling', e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography>Error Handling Tests</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Test error conditions and edge cases
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generationConfig.includePerformanceTests}
                            onChange={(e) => handleConfigChange('includePerformanceTests', e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography>Performance Tests</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Test performance characteristics
                            </Typography>
                          </Box>
                        }
                      />
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Generation Settings */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Generation Settings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <FormLabel>Max Tests Per Function</FormLabel>
                          <Slider
                            value={generationConfig.maxTestsPerFunction}
                            onChange={(e, value) => handleConfigChange('maxTestsPerFunction', value)}
                            min={1}
                            max={10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <FormLabel>Complexity Threshold</FormLabel>
                          <Slider
                            value={generationConfig.complexityThreshold}
                            onChange={(e, value) => handleConfigChange('complexityThreshold', value)}
                            min={1}
                            max={10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                          />
                        </FormControl>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* AI Settings */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">AI Model Settings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>AI Model</InputLabel>
                          <Select
                            value={generationConfig.aiSettings.model}
                            onChange={(e) => handleAISettingChange('model', e.target.value)}
                            label="AI Model"
                          >
                            {aiModels.map((model) => (
                              <MenuItem key={model.value} value={model.value}>
                                <Box>
                                  <Typography>{model.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {model.description}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <FormLabel>Temperature (Creativity)</FormLabel>
                          <Slider
                            value={generationConfig.aiSettings.temperature}
                            onChange={(e, value) => handleAISettingChange('temperature', value)}
                            min={0.1}
                            max={1.0}
                            step={0.1}
                            marks={[
                              { value: 0.1, label: 'Conservative' },
                              { value: 0.7, label: 'Balanced' },
                              { value: 1.0, label: 'Creative' }
                            ]}
                            valueLabelDisplay="auto"
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Max Tokens"
                          type="number"
                          value={generationConfig.aiSettings.maxTokens}
                          onChange={(e) => handleAISettingChange('maxTokens', parseInt(e.target.value))}
                          inputProps={{ min: 512, max: 4096 }}
                          helperText="Maximum response length"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={generateTests}
                    disabled={isGenerating}
                    startIcon={isGenerating ? <Stop /> : <PlayArrow />}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Tests'}
                  </Button>
                </Box>
              </Grid>

              {isGenerating && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      {generationStatus}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={generationProgress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Generation Complete
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>Success!</AlertTitle>
              Tests have been generated successfully. You can now review and customize them.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Generation Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Unit Tests:</Typography>
                        <Chip label="5" color="primary" size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Integration Tests:</Typography>
                        <Chip label="2" color="secondary" size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Error Tests:</Typography>
                        <Chip label="3" color="warning" size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Total Tests:</Typography>
                        <Chip label="10" color="success" size="small" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Estimated Coverage
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Line Coverage:</Typography>
                        <Typography color="success.main">87%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Branch Coverage:</Typography>
                        <Typography color="warning.main">72%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Function Coverage:</Typography>
                        <Typography color="success.main">100%</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={handleReset}>
                      Start Over
                    </Button>
                    <Button variant="contained" onClick={handleNext}>
                      Review Tests
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Test Generator
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate comprehensive test cases for your code using advanced AI models.
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>
              <Typography variant="h6">{step.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
            <StepContent>
              {renderStepContent(index)}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};

export default TestGeneratorUI;