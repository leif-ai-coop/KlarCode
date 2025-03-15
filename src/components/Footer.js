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
        © {year} KlarCode
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Daten: <Link href="https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/ICD/ICD-10-GM/_node.html" target="_blank" rel="noopener noreferrer">ICD-10-GM</Link> und <Link href="https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/OPS-ICHI/OPS/_node.html" target="_blank" rel="noopener noreferrer">OPS</Link> herausgegeben vom <Link href="https://www.bfarm.de" target="_blank" rel="noopener noreferrer">BfArM</Link>
      </Typography>
    </Box>
  );
};

export default Footer; 