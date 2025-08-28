import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Box, Paper, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import {
  ContentCopy,
  Fullscreen,
  FullscreenExit,
  Settings,
  FormatAlignLeft,
  BugReport,
  Lightbulb
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { selectCodeEditorSettings, updateCodeEditorSettings } from '../store/slices/uiSlice';

/**
 * Advanced Code Editor Component using Monaco Editor
 * Features: Syntax highlighting, IntelliSense, error detection, multiple languages
 */
const CodeEditor = ({
  value = '',
  onChange,
  language = 'javascript',
  height = '400px',
  readOnly = false,
  showMinimap = true,
  showLineNumbers = true,
  theme: propTheme,
  placeholder = 'Enter your code here...',
  onLanguageChange,
  errors = [],
  warnings = [],
  suggestions = [],
  className = ''
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [editorInstance, setEditorInstance] = useState(null);
  
  const theme = useTheme();
  const dispatch = useDispatch();
  const editorSettings = useSelector(selectCodeEditorSettings);

  // Language configurations
  const supportedLanguages = [
    { value: 'javascript', label: 'JavaScript', ext: '.js' },
    { value: 'typescript', label: 'TypeScript', ext: '.ts' },
    { value: 'python', label: 'Python', ext: '.py' },
    { value: 'java', label: 'Java', ext: '.java' },
    { value: 'cpp', label: 'C++', ext: '.cpp' },
    { value: 'csharp', label: 'C#', ext: '.cs' },
    { value: 'json', label: 'JSON', ext: '.json' },
    { value: 'markdown', label: 'Markdown', ext: '.md' }
  ];

  // Initialize Monaco Editor
  useEffect(() => {
    if (containerRef.current && !editorInstance) {
      // Configure Monaco environment
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      
      // Set compiler options for TypeScript
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      });

      // Create editor instance
      const editor = monaco.editor.create(containerRef.current, {
        value: value,
        language: currentLanguage,
        theme: getMonacoTheme(),
        fontSize: editorSettings.fontSize,
        tabSize: editorSettings.tabSize,
        insertSpaces: true,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
        lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: readOnly,
        contextmenu: true,
        selectOnLineNumbers: true,
        glyphMargin: true,
        folding: true,
        foldingStrategy: 'auto',
        showFoldingControls: 'always',
        unfoldOnClickAfterEndOfLine: false,
        cursorStyle: 'line',
        cursorBlinking: 'blink',
        renderWhitespace: 'selection',
        renderControlCharacters: false,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        acceptSuggestionOnCommitCharacter: true,
        snippetSuggestions: 'top',
        emptySelectionClipboard: false,
        copyWithSyntaxHighlighting: true,
        multiCursorModifier: 'ctrlCmd'
      });

      // Set up change listener
      editor.onDidChangeModelContent(() => {
        const currentValue = editor.getValue();
        onChange?.(currentValue);
      });

      // Set up cursor position listener
      editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        // You can emit cursor position changes here if needed
      });

      // Store references
      editorRef.current = editor;
      monacoRef.current = monaco;
      setEditorInstance(editor);

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Save functionality - you can customize this
        console.log('Save shortcut pressed');
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        editor.getAction('actions.find').run();
      });

      // Focus editor
      editor.focus();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorInstance && value !== editorInstance.getValue()) {
      editorInstance.setValue(value);
    }
  }, [value, editorInstance]);

  // Update language when prop changes
  useEffect(() => {
    if (editorInstance && currentLanguage !== language) {
      const model = editorInstance.getModel();
      monaco.editor.setModelLanguage(model, language);
      setCurrentLanguage(language);
    }
  }, [language, editorInstance, currentLanguage]);

  // Update theme when theme changes
  useEffect(() => {
    if (editorInstance) {
      monaco.editor.setTheme(getMonacoTheme());
    }
  }, [theme.palette.mode, propTheme, editorInstance]);

  // Update editor settings
  useEffect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({
        fontSize: editorSettings.fontSize,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
        lineNumbers: editorSettings.lineNumbers ? 'on' : 'off'
      });
    }
  }, [editorSettings, editorInstance]);

  // Update error markers
  useEffect(() => {
    if (editorInstance && monacoRef.current) {
      const model = editorInstance.getModel();
      const markers = [];

      // Add error markers
      errors.forEach(error => {
        markers.push({
          startLineNumber: error.line,
          startColumn: error.column || 1,
          endLineNumber: error.line,
          endColumn: error.column || 100,
          message: error.message,
          severity: monacoRef.current.MarkerSeverity.Error
        });
      });

      // Add warning markers
      warnings.forEach(warning => {
        markers.push({
          startLineNumber: warning.line,
          startColumn: warning.column || 1,
          endLineNumber: warning.line,
          endColumn: warning.column || 100,
          message: warning.message,
          severity: monacoRef.current.MarkerSeverity.Warning
        });
      });

      monacoRef.current.editor.setModelMarkers(model, 'code-analysis', markers);
    }
  }, [errors, warnings, editorInstance]);

  // Get Monaco theme based on current theme
  const getMonacoTheme = useCallback(() => {
    if (propTheme) return propTheme;
    return theme.palette.mode === 'dark' ? 'vs-dark' : 'vs';
  }, [theme.palette.mode, propTheme]);

  // Handle language change
  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setCurrentLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
    
    if (editorInstance) {
      const model = editorInstance.getModel();
      monaco.editor.setModelLanguage(model, newLanguage);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    setTimeout(() => {
      if (editorInstance) {
        editorInstance.layout();
      }
    }, 100);
  };

  // Copy content to clipboard
  const copyToClipboard = async () => {
    if (editorInstance) {
      const content = editorInstance.getValue();
      try {
        await navigator.clipboard.writeText(content);
        // You can show a toast notification here
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  // Format code
  const formatCode = () => {
    if (editorInstance) {
      editorInstance.getAction('editor.action.formatDocument').run();
    }
  };

  // Auto-detect language based on content
  const detectLanguage = useCallback((code) => {
    if (!code.trim()) return 'javascript';
    
    // Simple language detection patterns
    const patterns = {
      python: /^\\s*(def |class |import |from .+ import|if __name__|print\\()/m,
      java: /^\\s*(public |private |protected |class |interface |import java\\.)/m,
      csharp: /^\\s*(using |namespace |public |private |class |interface )/m,
      cpp: /^\\s*(#include|using namespace|int main\\(|class |struct )/m,
      typescript: /^\\s*(interface |type |enum |import .+ from|export )/m,
      json: /^\\s*[{\\[].*[}\\]]\\s*$/s
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }

    return 'javascript'; // default
  }, []);

  // Auto-detect language when content changes
  useEffect(() => {
    if (value && editorSettings.autoDetectLanguage) {
      const detectedLanguage = detectLanguage(value);
      if (detectedLanguage !== currentLanguage) {
        setCurrentLanguage(detectedLanguage);
        onLanguageChange?.(detectedLanguage);
      }
    }
  }, [value, detectLanguage, currentLanguage, editorSettings.autoDetectLanguage, onLanguageChange]);

  const currentLangInfo = supportedLanguages.find(lang => lang.value === currentLanguage);

  return (
    <Paper 
      className={`code-editor ${className}`}
      sx={{ 
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        height: isFullscreen ? '100vh' : height,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Editor Toolbar */}
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Language Selector */}
          <FormControl size=\"small\" sx={{ minWidth: 120 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={currentLanguage}
              onChange={handleLanguageChange}
              label=\"Language\"
            >
              {supportedLanguages.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Indicators */}
          {errors.length > 0 && (
            <Chip
              icon={<BugReport />}
              label={`${errors.length} Error${errors.length > 1 ? 's' : ''}`}
              color=\"error\"
              size=\"small\"
            />
          )}
          
          {warnings.length > 0 && (
            <Chip
              icon={<Lightbulb />}
              label={`${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`}
              color=\"warning\"
              size=\"small\"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Action Buttons */}
          <Tooltip title=\"Copy Code\">
            <IconButton onClick={copyToClipboard} size=\"small\">
              <ContentCopy />
            </IconButton>
          </Tooltip>
          
          <Tooltip title=\"Format Code\">
            <IconButton onClick={formatCode} size=\"small\">
              <FormatAlignLeft />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton onClick={toggleFullscreen} size=\"small\">
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title=\"Editor Settings\">
            <IconButton size=\"small\">
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Monaco Editor Container */}
      <Box 
        ref={containerRef}
        sx={{ 
          flexGrow: 1,
          height: isFullscreen ? 'calc(100vh - 48px)' : `calc(${height} - 48px)`,
          '& .monaco-editor': {
            '& .margin': {
              backgroundColor: 'transparent'
            }
          }
        }} 
      />

      {/* Empty State */}
      {!value && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'text.secondary',
            fontSize: '1.1rem',
            pointerEvents: 'none',
            opacity: 0.6
          }}
        >
          {placeholder}
        </Box>
      )}
    </Paper>
  );
};

export default CodeEditor;"