import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const ThemeToggle = ({ toggleColorMode }) => {
  const theme = useTheme();
  
  return (
    <Tooltip title={theme.palette.mode === 'dark' ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        aria-label="Theme umschalten"
        sx={{ ml: 1 }}
      >
        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle; 