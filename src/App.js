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
import { loadICDData, loadOPSData, getAvailableYears, loadOPSMigrationData, loadICDMigrationData } from './services/dataService';
import { diffCatalogs } from './utils/catalogDiff';

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
  
  // STATE FOR COMPARISON VIEW
  const [diffCatalogType, setDiffCatalogType] = useState('icd');
  const [diffYearOld, setDiffYearOld] = useState('');
  const [diffYearNew, setDiffYearNew] = useState('');
  const [diffYears, setDiffYears] = useState([]);
  const [diffIsLoading, setDiffIsLoading] = useState(false);
  const [diffError, setDiffError] = useState(null);
  const [diffTreeData, setDiffTreeData] = useState(null);
  const [diffIcdChapters, setDiffIcdChapters] = useState(null);
  const [diffIcdGroups, setDiffIcdGroups] = useState(null);
  const [diffExpandedNodes, setDiffExpandedNodes] = useState({}); // Add state for expanded nodes

  // Load available years for diff view
  React.useEffect(() => {
    getAvailableYears()
      .then(availableYears => {
        setDiffYears(availableYears);
        if (availableYears && availableYears.length >= 2) {
          const sortedYears = [...availableYears].sort((a, b) => b.localeCompare(a));
          setDiffYearNew(sortedYears[0]); 
          setDiffYearOld(sortedYears[1]); 
        }
      })
      .catch(() => setDiffYears([]));
  }, []);
  
  // HANDLERS FOR COMPARISON VIEW
  const handleDiffCompare = useCallback(async () => {
    setDiffError(null);
    setDiffIcdChapters(null);
    setDiffIcdGroups(null);
    setDiffExpandedNodes({}); // Reset expanded nodes on new comparison
    setDiffIsLoading(true);
    try {
      let oldData, newData, migrationData = null;
      if (diffCatalogType === 'icd') {
        oldData = await loadICDData(diffYearOld);
        newData = await loadICDData(diffYearNew);
        migrationData = await loadICDMigrationData(diffYearOld, diffYearNew);
        console.log('ICD-Umsteiger geladen:', migrationData);
        setDiffIcdChapters(newData.chapters); 
        setDiffIcdGroups(newData.groups);     
      } else {
        oldData = await loadOPSData(diffYearOld);
        newData = await loadOPSData(diffYearNew);
        migrationData = await loadOPSMigrationData(diffYearOld, diffYearNew);
        console.log('OPS-Umsteiger geladen:', migrationData);
        setDiffIcdChapters(null);
        setDiffIcdGroups(null);
      }
      
      console.log('Vergleich: alt', diffYearOld, 'neu', diffYearNew);
      console.log('oldData', oldData);
      console.log('newData', newData);
      
      const diff = diffCatalogs({ 
        oldCatalog: oldData, 
        newCatalog: newData, 
        type: diffCatalogType,
        migrationData,
        oldYear: diffYearOld,
        newYear: diffYearNew
      });
      setDiffTreeData(diff);
    } catch (e) {
      setDiffError(e.message || 'Fehler beim Laden oder Vergleichen der Kataloge.');
    } finally {
      setDiffIsLoading(false);
    }
  }, [diffCatalogType, diffYearOld, diffYearNew]);

  const handleDiffCatalogChange = useCallback((event) => {
    const newCatalogType = event.target.value;
    setDiffCatalogType(newCatalogType);
    // Clear results and expansion state on type change
    setDiffTreeData(null);
    setDiffError(null);
    setDiffIcdChapters(null);
    setDiffIcdGroups(null);
    setDiffExpandedNodes({}); 
  }, []);

  const handleDiffYearOldChange = useCallback((event) => {
    const newYear = event.target.value;
    setDiffYearOld(newYear);
    // Clear results and expansion state on year change
    setDiffTreeData(null);
    setDiffError(null);
    setDiffIcdChapters(null);
    setDiffIcdGroups(null);
    setDiffExpandedNodes({});
  }, []);

  const handleDiffYearNewChange = useCallback((event) => {
    const newYear = event.target.value;
    setDiffYearNew(newYear);
    // Clear results and expansion state on year change
    setDiffTreeData(null);
    setDiffError(null);
    setDiffIcdChapters(null);
    setDiffIcdGroups(null);
    setDiffExpandedNodes({});
  }, []);

  // Handler to toggle node expansion state
  const handleToggleDiffNode = useCallback((nodeId) => {
    setDiffExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
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
                  <CatalogDiffView 
                    catalogType={diffCatalogType}
                    yearOld={diffYearOld}
                    yearNew={diffYearNew}
                    years={diffYears}
                    loading={diffIsLoading}
                    error={diffError}
                    diffTree={diffTreeData} 
                    icdChapters={diffIcdChapters}
                    icdGroups={diffIcdGroups}
                    expandedNodes={diffExpandedNodes} // Pass down expanded nodes state
                    onCompare={handleDiffCompare}
                    onCatalogChange={handleDiffCatalogChange}
                    onYearOldChange={handleDiffYearOldChange}
                    onYearNewChange={handleDiffYearNewChange}
                    onToggleNode={handleToggleDiffNode} // Pass down node toggle handler
                  />
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