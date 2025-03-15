import React from 'react';
import { AppBar, Toolbar, Typography, Box, useMediaQuery, useTheme } from '@mui/material';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ThemeToggle from './ThemeToggle';

const Header = ({ toggleColorMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.85)' 
          : 'primary.main',
        boxShadow: 3,
        mb: 3
      }}
    >
      <Toolbar>
        <MedicalInformationIcon sx={{ mr: 2 }} />
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          component="h1" 
          sx={{ flexGrow: 1, fontWeight: 'bold' }}
        >
          Medizinische Codes
        </Typography>
        <Box>
          <ThemeToggle toggleColorMode={toggleColorMode} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 