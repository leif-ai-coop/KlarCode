import React, { useState } from 'react';
import { TextField, Button, Box, FormControl, InputLabel, Select, MenuItem, Paper, Typography, Chip, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * Search box component for entering medical codes
 */
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
  const availableYears = ['2025', '2026'];
  
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  const handleSubmit = () => {
    onInputChange(inputValue);
    onSearch();
  };
  
  const handleClear = () => {
    setInputValue('');
    onClear();
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2,
        backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.9)' : 'white'
      }}
    >
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
          placeholder="Geben Sie ICD/OPS Codes ein (z.B. A00.1, 1-20.2) oder nutzen Sie Wildcards (z.B. A0*, 1-20*)"
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
          Mehrere Codes können durch Komma, Semikolon, Leerzeichen oder Zeilenumbruch getrennt werden.
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="year-select-label">Jahr</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            label="Jahr"
            onChange={(e) => onYearChange(e.target.value)}
          >
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isLoading || !inputValue.trim()}
          startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
        >
          {isLoading ? 'Suche läuft...' : 'Suchen'}
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleClear}
          disabled={isLoading || (!inputValue && !searchInput)}
        >
          Löschen
        </Button>
      </Box>
      
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((error, index) => (
            <Chip
              key={index}
              label={error}
              color="error"
              variant="outlined"
              sx={{ m: 0.5 }}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default SearchBox; 