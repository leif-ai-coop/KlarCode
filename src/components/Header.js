import React from 'react';
import { AppBar, Toolbar, Typography, Box, useMediaQuery, useTheme, IconButton } from '@mui/material';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
        <IconButton 
          component="a" 
          href="https://warming.cloud/" 
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          sx={{ 
            mr: 2,
            backgroundColor: 'transparent', 
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <MedicalInformationIcon sx={{ mr: 2 }} />
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          component="h1" 
          sx={{ flexGrow: 1, fontWeight: 'bold' }}
        >
          KlarCode
        </Typography>
        <Box>
          <ThemeToggle toggleColorMode={toggleColorMode} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 