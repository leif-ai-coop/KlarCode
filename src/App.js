import React, { useMemo, useState } from 'react';
import { 
  CssBaseline, 
  Container, 
  Box, 
  ThemeProvider, 
  createTheme, 
  CircularProgress
} from '@mui/material';
import { grey } from '@mui/material/colors';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchBox from './components/SearchBox';
import ResultsTable from './components/ResultsTable';
import useCodeSearch from './hooks/useCodeSearch';

// Create a theme based on mode (light/dark)
const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#9c27b0',
          },
          background: {
            default: '#f5f5f5',
            paper: '#fff',
          },
        }
      : {
          // Dark mode
          primary: {
            main: '#90caf9',
          },
          secondary: {
            main: '#ce93d8',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#fff',
            secondary: grey[500],
          },
        }),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5',
          transition: 'background-color 0.3s ease',
        },
      }),
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.3s ease',
        },
      },
    },
  },
});

function App() {
  const [mode, setMode] = useState(() => {
    // Check for saved theme preference or use system preference
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      return savedMode;
    }
    
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  
  // Update localStorage when theme changes
  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };
  
  // Create theme based on current mode
  const theme = useMemo(
    () => createTheme(getDesignTokens(mode)),
    [mode]
  );
  
  // Use our custom hook for search functionality
  const {
    searchInput,
    searchResults,
    isLoading,
    errors,
    duplicatesRemoved,
    selectedYear,
    showMore,
    handleInputChange,
    handleSearch,
    handleYearChange,
    toggleShowMore,
    handleClear,
  } = useCodeSearch();
  
  // Add debugging before rendering ResultsTable
  console.log('App.js - Before rendering ResultsTable:', {
    searchResultsLength: searchResults.length, 
    showMore,
    toggleShowMoreType: typeof toggleShowMore
  });
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          background: theme.palette.background.default
        }}
      >
        <Header toggleColorMode={toggleColorMode} />
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <SearchBox
            searchInput={searchInput}
            onInputChange={handleInputChange}
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={isLoading}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            errors={errors}
          />
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ResultsTable
              results={searchResults}
              duplicatesRemoved={duplicatesRemoved}
              showMore={showMore}
              toggleShowMore={toggleShowMore}
            />
          )}
        </Container>
        
        <Footer />
      </Box>
    </ThemeProvider>
  );
}

export default App; 