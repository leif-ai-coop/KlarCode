import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, Chip, CircularProgress, IconButton, InputAdornment, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import { getAvailableYears } from '../services/dataService';

const SearchBox = ({ 
  searchInput, 
  onInputChange, 
  onSearch, 
  onClear, 
  isLoading, 
  selectedYear, 
  onYearChange, 
  errors 
}) => {
  const [inputValue, setInputValue] = useState(searchInput);
  const [availableYears, setAvailableYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(true);

  useEffect(() => {
    const loadYears = async () => {
      try {
        setLoadingYears(true);
        const years = await getAvailableYears();
        setAvailableYears(years);

        if (years.length > 0 && !years.includes(selectedYear)) {
          onYearChange(years[0]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der verfügbaren Jahre:', error);
        setAvailableYears(['2025']);
      } finally {
        setLoadingYears(false);
      }
    };

    loadYears();
  }, [onYearChange, selectedYear]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    onSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    onClear();
  };

  const handleCopyAllMissingCodes = () => {
    if (!errors || errors.length === 0) {
      return;
    }
    
    const missingCodes = errors
      .filter(error => error.includes("nicht im Jahr") || error.includes("nicht vorhanden"))
      .map(error => {
        const match = error.match(/: ([A-Za-z0-9.-]+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    
    if (missingCodes.length === 0) {
      return;
    }
    
    navigator.clipboard.writeText(missingCodes.join('\n'))
      .then(() => {
        alert(`${missingCodes.length} fehlende Code(s) in die Zwischenablage kopiert`);
      })
      .catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Fehler beim Kopieren der Codes.');
      });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        ICD/OPS Code-Suche
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="ICD/OPS Codes eingeben"
          variant="outlined"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Geben Sie ICD/OPS Codes ein (z.B. A20.1 oder a201 bzw. 1-20.2 oder 1202). Geben Sie mindestens die ersten drei Stellen ein."
          multiline
          rows={3}
          InputProps={{
            endAdornment: inputValue && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear input"
                  onClick={handleClear}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Typography variant="caption" color="textSecondary">
          Geben Sie mindestens die ersten drei Stellen ein. Mehrere Codes können durch Komma, Semikolon, Leerzeichen oder Zeilenumbruch getrennt werden. * oder % können am Ende von Codes stehen. Duplikate und Seitenangaben werden automatisch entfernt. 
        </Typography>
      </Box>

      {/* Fehler als Pill-Buttons (wie im Original) und Kopieren-Button */}
      {errors && errors.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {errors.map((error, index) => (
            <Chip
              key={index}
              label={error}
              color="error"
              variant="outlined"
              sx={{ 
                borderRadius: '30px', 
                py: 1.5, 
                color: '#e53935', 
                borderColor: '#e53935',
                bgcolor: 'rgba(229, 57, 53, 0.08)'
              }}
            />
          ))}
          
          {errors.some(error => error.includes("nicht im Jahr") || error.includes("nicht vorhanden")) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, width: '100%' }}>
              <Tooltip title="Nicht gefundene Codes in die Zwischenablage kopieren">
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<FileCopyOutlinedIcon />}
                  onClick={handleCopyAllMissingCodes}
                >
                  FEHLENDE CODES KOPIEREN
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <FormControl 
          sx={{ minWidth: 120 }}
          variant="outlined"
        >
          <InputLabel id="year-select-label">Jahr</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            label="Jahr"
            disabled={loadingYears || isLoading}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isLoading}
          startIcon={<SearchIcon />}
          sx={{ minWidth: 120 }}
        >
          SUCHEN
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleClear}
          disabled={!inputValue.trim() || isLoading}
          sx={{ minWidth: 120 }}
        >
          LÖSCHEN
        </Button>
      </Box>
    </Box>
  );
};

export default SearchBox;
