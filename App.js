import React, { useState, useEffect } from 'react';

const [theme, setTheme] = useState(() => ({
  mode: localStorage.getItem("mode") || "light",
  acceptedTerms: false
}));

useEffect(() => {
  localStorage.setItem("mode", theme.mode);
}, [theme.mode]); 