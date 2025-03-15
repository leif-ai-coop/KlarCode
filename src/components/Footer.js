import React from 'react';
import { Box, Typography, Link, useTheme } from '@mui/material';

const Footer = () => {
  const theme = useTheme();
  const year = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 3, 
        mt: 'auto',
        textAlign: 'center',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.85)' 
          : 'rgba(0, 0, 0, 0.05)',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {year} Medizinische Codes Lookup
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Daten basierend auf ICD-10-GM und OPS Katalog {year >= 2025 ? year : 2025}
      </Typography>
    </Box>
  );
};

export default Footer; 