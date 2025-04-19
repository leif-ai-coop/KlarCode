import React, { useCallback } from 'react';

// OLD implementation of toggleShowMore:
// const toggleShowMore = useCallback(() => {
//   setShowMore(prev => !prev);
// }, []);

// NEW implementation of toggleShowMore with proper dependencies and error handling
const toggleShowMore = useCallback(() => {
  if (!searchInput || searchInput.trim() === '') {
    console.error('toggleShowMore: searchInput is empty. Please provide a valid search input.');
    return;
  }
  try {
    setShowMore(prev => !prev);
  } catch (error) {
    console.error('toggleShowMore encountered an error:', error);
  }
}, [showMore, searchInput]);

// ... existing code ... 