import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  CssBaseline, 
  Container, 
  Box, 
  ThemeProvider, 
  createTheme, 
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Link,
  Typography
} from '@mui/material';
import { grey } from '@mui/material/colors';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchBox from './components/SearchBox';
import ResultsTable from './components/ResultsTable';
import useCodeSearch from './hooks/useCodeSearch';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CatalogDiffView from './components/CatalogDiffView';

// Create a theme based on mode (light/dark)
const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#1A3344',
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
            main: '#6B9FA1',
          },
          secondary: {
            main: '#ce93d8',
          },
          background: {
            default: '#1A3344',
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
          backgroundColor: mode === 'dark' ? '#1A3344' : '#f5f5f5',
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
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A3344',
        },
      },
    },
  },
});

function App() {
  const [mode, setMode] = useState(() => {
    // Check for saved theme preference
    const savedMode = localStorage.getItem('themeMode');
    // Wenn eine gespeicherte Einstellung existiert, verwende diese
    if (savedMode) {
      return savedMode;
    }
    
    // Sonst verwende immer 'light' als Standard, unabhängig von der Systemeinstellung
    return 'light';
  });
  
  // Add state for terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  
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
    removedDuplicates,
    selectedYear,
    showMore,
    searchType,
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
  
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Suche, 1 = Diff

  useEffect(() => {
    // Dark-Mode-Klasse zum HTML-Element hinzufügen/entfernen
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const handleCopyCode = useCallback((code) => {
    // Code in die Zwischenablage kopieren
    navigator.clipboard.writeText(code)
      .then(() => {
        // Optional: Erfolgsbenachrichtigung
        console.log('Code in die Zwischenablage kopiert:', code);
      })
      .catch(err => {
        console.error('Fehler beim Kopieren in die Zwischenablage:', err);
      });
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen bg-white dark:bg-brand-blue text-gray-900 dark:text-white">
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
            <Box sx={{ 
              p: 3, 
              borderRadius: 3, 
              boxShadow: 2, 
              background: theme.palette.background.paper,
            }}>
              <Box sx={{ 
                opacity: termsAccepted ? 1 : 0.5, // Dim if not accepted
                pointerEvents: termsAccepted ? 'auto' : 'none' // Disable interaction if not accepted
              }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Suche" />
                  <Tab label="ICD/OPS-Vergleich" />
                </Tabs>
                {activeTab === 0 && (
                  <>
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
                        removedDuplicates={removedDuplicates}
                        showMore={showMore}
                        toggleShowMore={toggleShowMore}
                        searchType={searchType}
                        onCopyCode={handleCopyCode}
                        errors={errors}
                      />
                    )}
                  </>
                )}
                {activeTab === 1 && (
                  <CatalogDiffView />
                )}
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      name="termsAccepted"
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Ich habe die{' '}
                      <Link 
                        href="https://warming.cloud/terms/nutzungsbedingungen.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent label click from toggling checkbox
                      >
                        Nutzungsbedingungen
                      </Link>
                      {' '}gelesen und akzeptiere sie.
                    </Typography>
                  }
                />
              </Box>
            </Box>
          </Container>
          
          <Footer />
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default App; 