import { useState, useCallback, useEffect } from 'react';
import { searchICDCodes, searchOPSCodes, getCurrentYear, loadICDData, loadOPSData } from '../services/dataService';
import { parseUserInput, analyzeCodeTypes } from '../utils/search';

/**
 * Custom hook for medical code searching
 */
const useCodeSearch = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [removedDuplicates, setRemovedDuplicates] = useState([]);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [showMore, setShowMore] = useState({
    kapitel: false,
    gruppe: false,
    dreisteller: false,
    childCodes: false,
    terminalCode: false,
    sideRequired: false,
    validityKHG: false,
    isAdditionalCode: false,
    isOneTimeCode: false
  });
  const [searchType, setSearchType] = useState('ops'); // Default to 'ops'
  
  // Initialize data loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        // Preload data for the current year
        await Promise.all([
          loadICDData(selectedYear),
          loadOPSData(selectedYear)
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        setErrors(prev => [...prev, `Fehler beim Laden der Daten: ${error.message}`]);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [selectedYear]);
  
  // Add this debugging effect
  useEffect(() => {
    console.log('DEBUG useCodeSearch - showMore state updated:', showMore);
  }, [showMore]);
  
  /**
   * Handle search input change
   * @param {string} value - New search input value
   */
  const handleInputChange = useCallback((value) => {
    setSearchInput(value);
  }, []);
  
  /**
   * Perform the search with the current input
   * @param {string} [searchText] - Optional text to search for, uses searchInput state if not provided
   */
  const handleSearch = useCallback(async (searchText) => {
    // Verwende searchText, wenn übergeben, sonst searchInput
    const textToSearch = searchText || searchInput;
    
    if (!textToSearch.trim()) {
      return;
    }
    
    // Aktualisiere den State-Wert, falls ein neuer Wert übergeben wurde
    if (searchText && searchText !== searchInput) {
      setSearchInput(searchText);
    }
    
    setIsLoading(true);
    setErrors([]);
    setSearchResults([]);
    setDuplicatesRemoved(0);
    
    try {
      // Entferne Duplikate EINMAL, bevor die Suche beginnt
      const { codes, duplicatesRemoved, removedDuplicatesList } = parseUserInput(textToSearch);
      const processedInput = codes.join(' ');
      
      // Speichere die Liste der entfernten Duplikate
      setRemovedDuplicates(removedDuplicatesList);
      
      // Übergebe showMore.childCodes an beide Suchfunktionen
      const [icdResults, opsResults] = await Promise.all([
        searchICDCodes(processedInput, selectedYear, showMore.childCodes),
        searchOPSCodes(processedInput, selectedYear, showMore.childCodes)
      ]);
      
      // Rest der Funktion bleibt gleich...
      const combinedResults = [...icdResults.results, ...opsResults.results];
      const combinedErrors = [...icdResults.errors, ...opsResults.errors];
      
      // Verwende duplicatesRemoved aus parseUserInput
      setDuplicatesRemoved(duplicatesRemoved);
      
      // Determine search type from input
      const { type } = analyzeCodeTypes(codes);
      setSearchType(type !== 'mixed' ? type : 'ops'); // Default to ops for mixed
      
      setSearchResults(combinedResults);
      setErrors(combinedErrors);
    } catch (error) {
      console.error('Error during search:', error);
      setErrors([`Fehler bei der Suche: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, selectedYear, showMore.childCodes]);
  
  /**
   * Handle year change
   * @param {string} year - New year value
   */
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);
  
  /**
   * Toggle showing additional info columns
   * @param {string} field - Field to toggle (kapitel, gruppe, dreisteller, childCodes)
   */
  const toggleShowMore = useCallback((field) => {
    console.log(`DEBUG toggleShowMore called for ${field}, current value:`, showMore[field]);
    
    // Den neuen (invertierten) Wert berechnen
    const newValue = !showMore[field];
    
    // State aktualisieren
    setShowMore(prev => ({
      ...prev,
      [field]: newValue
    }));
    
    // Wenn childCodes geändert wurde und ein Suchbegriff vorhanden ist,
    // führe eine neue Suche mit dem NEUEN Wert durch
    if (field === 'childCodes' && searchInput.trim()) {
      console.log(`DEBUG triggering new search with childCodes=${newValue}`);
      
      // Entferne Duplikate EINMAL, bevor die Suche beginnt
      const { codes, duplicatesRemoved, removedDuplicatesList } = parseUserInput(searchInput);
      const processedInput = codes.join(' ');
      
      // Speichere die Liste der entfernten Duplikate
      setRemovedDuplicates(removedDuplicatesList);
      
      // Direkt mit dem neuen (invertierten) Wert suchen
      setIsLoading(true);
      setErrors([]);
      
      // Existierende Ergebnisse behalten, bis neue geladen sind
      Promise.all([
        searchICDCodes(processedInput, selectedYear, newValue),
        searchOPSCodes(processedInput, selectedYear, newValue)
      ]).then(([icdResults, opsResults]) => {
        const combinedResults = [...icdResults.results, ...opsResults.results];
        const combinedErrors = [...icdResults.errors, ...opsResults.errors];
        const totalDuplicatesRemoved = icdResults.duplicatesRemoved + opsResults.duplicatesRemoved;
        
        setSearchResults(combinedResults);
        setErrors(combinedErrors);
        setDuplicatesRemoved(duplicatesRemoved);
      }).catch(error => {
        console.error('Error during search:', error);
        setErrors([`Fehler bei der Suche: ${error.message}`]);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [searchInput, selectedYear, showMore]);
  
  /**
   * Clear all search results and inputs
   */
  const handleClear = useCallback(() => {
    setSearchInput('');
    setSearchResults([]);
    setErrors([]);
    setDuplicatesRemoved(0);
  }, []);
  
  return {
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
  };
};

export default useCodeSearch; 