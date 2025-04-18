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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Die Erstellung erfolgt unter Verwendung der maschinenlesbaren Fassungen des <Link href="https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/ICD/ICD-10-GM/_node.html" target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>ICD-10-GM</Link> und des <Link href="https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/OPS-ICHI/OPS/_node.html" target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>OPS</Link> des Bundesinstituts für Arzneimittel und Medizinprodukte (<Link href="https://www.bfarm.de" target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>BfArM</Link>).
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        <Link href="https://warming.cloud/terms/nutzungsbedingungen.html" target="_blank" rel="noopener noreferrer" sx={{ mx: 2, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Nutzungsbedingungen</Link>
        <Link href="https://warming.cloud/terms/datenschutz.html" target="_blank" rel="noopener noreferrer" sx={{ mx: 2, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Datenschutzerklärung</Link>
        <Link href="https://warming.cloud/terms/impressum.html" target="_blank" rel="noopener noreferrer" sx={{ mx: 2, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Impressum</Link>
      </Typography>
    </Box>
  );
};

export default Footer; 