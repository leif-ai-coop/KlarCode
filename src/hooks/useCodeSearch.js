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
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [showMore, setShowMore] = useState({
    kapitel: false,
    gruppe: false,
    dreisteller: false
  });
  
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
      // Verwende textToSearch statt searchInput
      const [icdResults, opsResults] = await Promise.all([
        searchICDCodes(textToSearch, selectedYear),
        searchOPSCodes(textToSearch, selectedYear)
      ]);
      
      // Rest der Funktion bleibt gleich...
      const combinedResults = [...icdResults.results, ...opsResults.results];
      const combinedErrors = [...icdResults.errors, ...opsResults.errors];
      const totalDuplicatesRemoved = icdResults.duplicatesRemoved + opsResults.duplicatesRemoved;
      
      setSearchResults(combinedResults);
      setErrors(combinedErrors);
      setDuplicatesRemoved(totalDuplicatesRemoved);
    } catch (error) {
      console.error('Error during search:', error);
      setErrors([`Fehler bei der Suche: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, selectedYear]);
  
  /**
   * Handle year change
   * @param {string} year - New year value
   */
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);
  
  /**
   * Toggle showing additional info columns
   * @param {string} field - Field to toggle (kapitel, gruppe, dreisteller)
   */
  const toggleShowMore = useCallback((field) => {
    setShowMore(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);
  
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
    selectedYear,
    showMore,
    handleInputChange,
    handleSearch,
    handleYearChange,
    toggleShowMore,
    handleClear,
  };
};

export default useCodeSearch; 