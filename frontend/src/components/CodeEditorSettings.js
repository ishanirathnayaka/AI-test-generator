import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Switch,
  Slider,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Divider,
  Grid
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { selectCodeEditorSettings, updateCodeEditorSettings } from '../store/slices/uiSlice';

/**
 * Code Editor Settings Dialog
 * Allows users to customize editor appearance and behavior
 */
const CodeEditorSettings = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const settings = useSelector(selectCodeEditorSettings);

  const handleSettingChange = (setting, value) => {
    dispatch(updateCodeEditorSettings({ [setting]: value }));
  };

  const resetToDefaults = () => {
    dispatch(updateCodeEditorSettings({
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: true,
      lineNumbers: true,
      autoComplete: true,
      autoDetectLanguage: true,
      theme: 'auto',
      showWhitespace: false,
      renderControlCharacters: false,
      cursorStyle: 'line',
      cursorBlinking: 'blink',
      autoIndent: true,
      bracketMatching: true,
      codeLens: true,
      folding: true,
      highlightActiveIndentGuide: true,
      scrollBeyondLastLine: false
    }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        Code Editor Settings
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={3}>
            {/* Appearance Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Appearance
              </Typography>
              
              <FormGroup sx={{ gap: 2 }}>
                {/* Font Size */}
                <FormControl>
                  <FormLabel>Font Size</FormLabel>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.fontSize}
                      onChange={(e, value) => handleSettingChange('fontSize', value)}
                      min={10}
                      max={24}
                      step={1}
                      marks={[
                        { value: 10, label: '10px' },
                        { value: 14, label: '14px' },
                        { value: 18, label: '18px' },
                        { value: 24, label: '24px' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </FormControl>

                {/* Tab Size */}
                <FormControl>
                  <FormLabel>Tab Size</FormLabel>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={settings.tabSize}
                      onChange={(e, value) => handleSettingChange('tabSize', value)}
                      min={2}
                      max={8}
                      step={1}
                      marks={[
                        { value: 2, label: '2' },
                        { value: 4, label: '4' },
                        { value: 8, label: '8' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </FormControl>

                {/* Theme */}
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.theme || 'auto'}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    label=\"Theme\"
                  >
                    <MenuItem value=\"auto\">Auto</MenuItem>
                    <MenuItem value=\"vs\">Light</MenuItem>
                    <MenuItem value=\"vs-dark\">Dark</MenuItem>
                    <MenuItem value=\"hc-black\">High Contrast</MenuItem>
                  </Select>
                </FormControl>

                {/* Cursor Style */}
                <FormControl fullWidth>
                  <InputLabel>Cursor Style</InputLabel>
                  <Select
                    value={settings.cursorStyle || 'line'}
                    onChange={(e) => handleSettingChange('cursorStyle', e.target.value)}
                    label=\"Cursor Style\"
                  >
                    <MenuItem value=\"line\">Line</MenuItem>
                    <MenuItem value=\"block\">Block</MenuItem>
                    <MenuItem value=\"underline\">Underline</MenuItem>
                    <MenuItem value=\"line-thin\">Thin Line</MenuItem>
                    <MenuItem value=\"block-outline\">Block Outline</MenuItem>
                    <MenuItem value=\"underline-thin\">Thin Underline</MenuItem>
                  </Select>
                </FormControl>
              </FormGroup>
            </Grid>

            {/* Behavior Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant=\"h6\" gutterBottom>
                Behavior
              </Typography>
              
              <FormGroup sx={{ gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.wordWrap}
                      onChange={(e) => handleSettingChange('wordWrap', e.target.checked)}
                    />
                  }
                  label=\"Word Wrap\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.minimap}
                      onChange={(e) => handleSettingChange('minimap', e.target.checked)}
                    />
                  }
                  label=\"Show Minimap\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.lineNumbers}
                      onChange={(e) => handleSettingChange('lineNumbers', e.target.checked)}
                    />
                  }
                  label=\"Show Line Numbers\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoComplete}
                      onChange={(e) => handleSettingChange('autoComplete', e.target.checked)}
                    />
                  }
                  label=\"Auto Complete\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoDetectLanguage}
                      onChange={(e) => handleSettingChange('autoDetectLanguage', e.target.checked)}
                    />
                  }
                  label=\"Auto Detect Language\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoIndent}
                      onChange={(e) => handleSettingChange('autoIndent', e.target.checked)}
                    />
                  }
                  label=\"Auto Indent\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.bracketMatching}
                      onChange={(e) => handleSettingChange('bracketMatching', e.target.checked)}
                    />
                  }
                  label=\"Bracket Matching\"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.folding}
                      onChange={(e) => handleSettingChange('folding', e.target.checked)}
                    />
                  }
                  label=\"Code Folding\"
                />
              </FormGroup>
            </Grid>

            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant=\"h6\" gutterBottom>
                Advanced
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormGroup sx={{ gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.showWhitespace}
                          onChange={(e) => handleSettingChange('showWhitespace', e.target.checked)}
                        />
                      }
                      label=\"Show Whitespace\"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.renderControlCharacters}
                          onChange={(e) => handleSettingChange('renderControlCharacters', e.target.checked)}
                        />
                      }
                      label=\"Render Control Characters\"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.codeLens}
                          onChange={(e) => handleSettingChange('codeLens', e.target.checked)}
                        />
                      }
                      label=\"Code Lens\"
                    />
                  </FormGroup>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormGroup sx={{ gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.highlightActiveIndentGuide}
                          onChange={(e) => handleSettingChange('highlightActiveIndentGuide', e.target.checked)}
                        />
                      }
                      label=\"Highlight Active Indent Guide\"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.scrollBeyondLastLine}
                          onChange={(e) => handleSettingChange('scrollBeyondLastLine', e.target.checked)}
                        />
                      }
                      label=\"Scroll Beyond Last Line\"
                    />

                    <FormControl fullWidth>
                      <InputLabel>Cursor Blinking</InputLabel>
                      <Select
                        value={settings.cursorBlinking || 'blink'}
                        onChange={(e) => handleSettingChange('cursorBlinking', e.target.value)}
                        label=\"Cursor Blinking\"
                      >
                        <MenuItem value=\"blink\">Blink</MenuItem>
                        <MenuItem value=\"smooth\">Smooth</MenuItem>
                        <MenuItem value=\"phase\">Phase</MenuItem>
                        <MenuItem value=\"expand\">Expand</MenuItem>
                        <MenuItem value=\"solid\">Solid</MenuItem>
                      </Select>
                    </FormControl>
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={resetToDefaults} color=\"inherit\">
          Reset to Defaults
        </Button>
        <Button onClick={onClose} variant=\"contained\">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeEditorSettings;"